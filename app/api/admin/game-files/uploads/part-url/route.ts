import { gameExists } from "@/lib/game-files";
import { requireAdminRouteActor } from "@/lib/admin-auth";
import {
  signedUploadPartUrl,
  uploadUrlTtlSeconds,
} from "@/lib/storage/backblaze";

type PartUrlBody = {
  gameId?: unknown;
  storageKey?: unknown;
  uploadId?: unknown;
  partNumber?: unknown;
};

export async function POST(request: Request) {
  const actor = await requireAdminRouteActor(request);
  if (actor instanceof Response) return actor;

  const body = (await request.json().catch(() => null)) as PartUrlBody | null;
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const storageKey = typeof body?.storageKey === "string" ? body.storageKey : "";
  const uploadId = typeof body?.uploadId === "string" ? body.uploadId : "";
  const partNumber = Number(body?.partNumber);

  if (
    !gameId ||
    !storageKey ||
    !uploadId ||
    !Number.isInteger(partNumber) ||
    partNumber < 1
  ) {
    return Response.json({ error: "Part upload data is incomplete." }, { status: 400 });
  }

  if (!storageKey.startsWith(`games/${gameId}/`)) {
    return Response.json({ error: "Storage key does not match the game." }, { status: 400 });
  }

  if (!(await gameExists(gameId))) {
    return Response.json({ error: "Game not found." }, { status: 404 });
  }

  return Response.json({
    url: await signedUploadPartUrl({
      key: storageKey,
      uploadId,
      partNumber,
    }),
    expiresInSeconds: uploadUrlTtlSeconds,
  });
}
