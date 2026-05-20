import { asc } from "drizzle-orm";

import { requireAdminRouteActor } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { game } from "@/schema";

export async function GET(request: Request) {
  const actor = await requireAdminRouteActor(request);
  if (actor instanceof Response) return actor;

  const games = await db
    .select({
      id: game.id,
      title: game.title,
      platform: game.platform,
      status: game.status,
    })
    .from(game)
    .orderBy(asc(game.title));

  return Response.json({ games });
}
