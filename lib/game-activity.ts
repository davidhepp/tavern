import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { game } from "@/schema";

export async function touchGame(gameId: string, updatedBy?: string | null) {
  await db
    .update(game)
    .set({
      updatedAt: new Date(),
      ...(updatedBy ? { updatedBy } : {}),
    })
    .where(eq(game.id, gameId));
}
