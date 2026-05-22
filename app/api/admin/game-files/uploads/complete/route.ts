import { revalidatePath } from "next/cache";

import {
  sanitizeFilename,
  validateGameFileInput,
} from "@/lib/game-file-constraints";
import { ensureGameQuota, gameExists } from "@/lib/game-files";
import { requireAdminRouteActor } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { touchGame } from "@/lib/game-activity";
import {
  completeMultipartUpload,
  headGameFileObject,
} from "@/lib/storage/backblaze";
import { gameFile } from "@/schema";

type CompleteBody = {
  gameId?: unknown;
  filename?: unknown;
  storageKey?: unknown;
  uploadId?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  checksum?: unknown;
  parts?: unknown;
};

function parseParts(value: unknown) {
  if (!Array.isArray(value)) return null;

  const parts = value.map((part) => {
    if (
      typeof part !== "object" ||
      part === null ||
      !("partNumber" in part) ||
      !("etag" in part)
    ) {
      return null;
    }

    return {
      partNumber: Number(part.partNumber),
      etag: String(part.etag),
    };
  });

  if (
    parts.some(
      (part) =>
        !part ||
        !Number.isInteger(part.partNumber) ||
        part.partNumber < 1 ||
        !part.etag,
    )
  ) {
    return null;
  }

  return parts as { partNumber: number; etag: string }[];
}

export async function POST(request: Request) {
  const actor = await requireAdminRouteActor(request);
  if (actor instanceof Response) return actor;

  const body = (await request.json().catch(() => null)) as CompleteBody | null;
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const filename = typeof body?.filename === "string" ? body.filename : "";
  const storageKey = typeof body?.storageKey === "string" ? body.storageKey : "";
  const uploadId = typeof body?.uploadId === "string" ? body.uploadId : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
  const sizeBytes = Number(body?.sizeBytes);
  const checksum = typeof body?.checksum === "string" ? body.checksum.trim() : "";
  const parts = parseParts(body?.parts);
  const validationError = validateGameFileInput({
    filename,
    mimeType,
    sizeBytes,
  });

  if (!gameId || !storageKey || !uploadId || !parts?.length) {
    return Response.json({ error: "Upload completion data is incomplete." }, { status: 400 });
  }

  if (!storageKey.startsWith(`games/${gameId}/`)) {
    return Response.json({ error: "Storage key does not match the game." }, { status: 400 });
  }

  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  if (!(await gameExists(gameId))) {
    return Response.json({ error: "Game not found." }, { status: 404 });
  }

  const quotaError = await ensureGameQuota(gameId, sizeBytes);

  if (quotaError) {
    return Response.json({ error: quotaError }, { status: 400 });
  }

  await completeMultipartUpload({ key: storageKey, uploadId, parts });

  const object = await headGameFileObject(storageKey);
  const storedSize = Number(object.ContentLength ?? 0);
  const storedMimeType = object.ContentType ?? mimeType;

  if (storedSize !== sizeBytes) {
    return Response.json(
      { error: "Completed object size does not match the requested upload." },
      { status: 400 },
    );
  }

  const [record] = await db
    .insert(gameFile)
    .values({
      id: crypto.randomUUID(),
      gameId,
      filename: sanitizeFilename(filename),
      storageKey,
      mimeType: storedMimeType,
      sizeBytes: storedSize,
      checksum: checksum || object.Metadata?.checksum || null,
      uploadedBy: actor.uploadedBy,
    })
    .returning();
  await touchGame(
    gameId,
    actor.type === "session" ? actor.uploadedBy : undefined,
  );

  revalidatePath("/");
  revalidatePath("/admin/games");

  return Response.json({ file: record });
}
