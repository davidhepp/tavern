import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { game } from "@/schema";

export async function userCanAccessGame(
  userId: string,
  gameId: string,
): Promise<boolean> {
  if (!userId || !gameId) return false;

  const [record] = await db
    .select({ id: game.id })
    .from(game)
    .where(eq(game.id, gameId))
    .limit(1);

  // TODO: Replace this existence check with real entitlement logic when the
  // product has game ownership, subscription, group, or license tables.
  return Boolean(record);
}
