import {
  MULTIPART_PART_SIZE_BYTES,
  sanitizeFilename,
  validateGameFileInput,
} from "@/lib/game-file-constraints";
import {
  buildStorageKey,
  ensureGameQuota,
  gameExists,
  multipartPartCount,
} from "@/lib/game-files";
import { requireAdminRouteActor } from "@/lib/admin-auth";
import {
  createMultipartUpload,
  signedUploadPartUrl,
  uploadUrlTtlSeconds,
} from "@/lib/storage/backblaze";

type UploadInitBody = {
  gameId?: unknown;
  filename?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  checksum?: unknown;
  includePartUrls?: unknown;
};

export async function POST(request: Request) {
  const actor = await requireAdminRouteActor(request);
  if (actor instanceof Response) return actor;

  const body = (await request.json().catch(() => null)) as UploadInitBody | null;
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const filename = typeof body?.filename === "string" ? body.filename : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
  const sizeBytes = Number(body?.sizeBytes);
  const checksum = typeof body?.checksum === "string" ? body.checksum.trim() : "";
  const includePartUrls = body?.includePartUrls !== false;
  const validationError = validateGameFileInput({
    filename,
    mimeType,
    sizeBytes,
  });

  if (!gameId) {
    return Response.json({ error: "A game is required." }, { status: 400 });
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

  const safeFilename = sanitizeFilename(filename);
  const storageKey = buildStorageKey({ gameId, filename: safeFilename });
  const uploadId = await createMultipartUpload({
    key: storageKey,
    filename: safeFilename,
    mimeType,
    checksum: checksum || null,
  });
  const partCount = multipartPartCount(sizeBytes);
  const parts = includePartUrls
    ? await Promise.all(
        Array.from({ length: partCount }, async (_, index) => {
          const partNumber = index + 1;

          return {
            partNumber,
            url: await signedUploadPartUrl({
              key: storageKey,
              uploadId,
              partNumber,
            }),
          };
        }),
      )
    : undefined;

  return Response.json({
    uploadId,
    storageKey,
    filename: safeFilename,
    partSizeBytes: MULTIPART_PART_SIZE_BYTES,
    partCount,
    expiresInSeconds: uploadUrlTtlSeconds,
    ...(parts ? { parts } : {}),
    uploadedBy: actor.uploadedBy,
  });
}
