import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { userCanAccessGame } from "@/lib/game-authorization";
import { getGameFile, recordGameFileDownload } from "@/lib/game-files";
import { signedDownloadUrl } from "@/lib/storage/backblaze";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { fileId } = await params;
  const file = await getGameFile(fileId);

  if (!file) {
    return Response.json({ error: "File not found." }, { status: 404 });
  }

  const canAccess = await userCanAccessGame(session.user.id, file.gameId);

  if (!canAccess) {
    return Response.json({ error: "Not authorized for this game." }, { status: 403 });
  }

  await recordGameFileDownload({
    fileId: file.id,
    ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: requestHeaders.get("user-agent"),
    userId: session.user.id,
  });
  revalidatePath("/");

  redirect(await signedDownloadUrl({
    key: file.storageKey,
    filename: file.filename,
  }));
}
