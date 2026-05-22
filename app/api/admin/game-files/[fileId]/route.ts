import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireAdminRouteActor } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { touchGame } from "@/lib/game-activity";
import { deleteGameFileObject } from "@/lib/storage/backblaze";
import { gameFile } from "@/schema";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const actor = await requireAdminRouteActor(request);
  if (actor instanceof Response) return actor;

  const { fileId } = await params;
  const [file] = await db
    .select()
    .from(gameFile)
    .where(eq(gameFile.id, fileId))
    .limit(1);

  if (!file) {
    return Response.json({ error: "File not found." }, { status: 404 });
  }

  await deleteGameFileObject(file.storageKey);
  await db.delete(gameFile).where(eq(gameFile.id, fileId));
  await touchGame(
    file.gameId,
    actor.type === "session" ? actor.uploadedBy : undefined,
  );

  revalidatePath("/");
  revalidatePath("/admin/games");

  return Response.json({ ok: true });
}
