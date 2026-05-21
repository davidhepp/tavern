import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { game, gameFile, gameFileDownload, user } from "@/schema";

export async function getAdminDownloads() {
  const [[totals], downloads] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)::int`,
        files: sql<number>`count(distinct ${gameFileDownload.fileId})::int`,
        users: sql<number>`count(distinct ${gameFileDownload.userId})::int`,
      })
      .from(gameFileDownload),
    db
      .select({
        id: gameFileDownload.id,
        at: gameFileDownload.createdAt,
        filename: gameFile.filename,
        gameTitle: game.title,
        ipAddress: gameFileDownload.ipAddress,
        mimeType: gameFile.mimeType,
        sizeBytes: gameFile.sizeBytes,
        userEmail: user.email,
        userName: user.name,
      })
      .from(gameFileDownload)
      .innerJoin(gameFile, eq(gameFileDownload.fileId, gameFile.id))
      .innerJoin(game, eq(gameFile.gameId, game.id))
      .innerJoin(user, eq(gameFileDownload.userId, user.id))
      .orderBy(desc(gameFileDownload.createdAt))
      .limit(100),
  ]);

  return {
    downloads,
    totals: {
      count: totals?.count ?? 0,
      files: totals?.files ?? 0,
      users: totals?.users ?? 0,
    },
  };
}
