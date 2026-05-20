import { requireAdminRouteActor } from "@/lib/admin-auth";
import { abortMultipartUpload } from "@/lib/storage/backblaze";

type UploadCancelBody = {
  gameId?: unknown;
  storageKey?: unknown;
  uploadId?: unknown;
};

export async function POST(request: Request) {
  const actor = await requireAdminRouteActor(request);
  if (actor instanceof Response) return actor;

  const body = (await request.json().catch(() => null)) as UploadCancelBody | null;
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const storageKey = typeof body?.storageKey === "string" ? body.storageKey : "";
  const uploadId = typeof body?.uploadId === "string" ? body.uploadId : "";

  if (!gameId || !storageKey || !uploadId) {
    return Response.json({ error: "Upload cancellation data is incomplete." }, { status: 400 });
  }

  if (!storageKey.startsWith(`games/${gameId}/`)) {
    return Response.json({ error: "Storage key does not match the game." }, { status: 400 });
  }

  await abortMultipartUpload({ key: storageKey, uploadId });

  return Response.json({ ok: true });
}
