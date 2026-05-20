import { asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { game, gameFile, gameFileDownload, gameResource, user } from "@/schema";

export type GameWithResources = Awaited<
  ReturnType<typeof getGameLibrary>
>[number];

const filenameSorter = new Intl.Collator("en-US", {
  numeric: true,
  sensitivity: "base",
});

function sortFilesByFilename<T extends { filename: string }>(files: T[]) {
  return [...files].sort((left, right) =>
    filenameSorter.compare(left.filename, right.filename),
  );
}

export async function getGameLibrary({ includeArchived = false } = {}) {
  const baseQuery = db.select().from(game);
  const games = await (includeArchived
    ? baseQuery.orderBy(desc(game.updatedAt), asc(game.title))
    : baseQuery
        .where(eq(game.status, "active"))
        .orderBy(desc(game.updatedAt), asc(game.title)));

  const resources = await db
    .select()
    .from(gameResource)
    .orderBy(asc(gameResource.sortOrder), asc(gameResource.title));
  const files = await db
    .select()
    .from(gameFile)
    .orderBy(asc(gameFile.filename));
  const downloaders = await db
    .select({
      fileId: gameFileDownload.fileId,
      userId: user.id,
      name: user.name,
      email: user.email,
      downloadedAt: gameFileDownload.updatedAt,
    })
    .from(gameFileDownload)
    .innerJoin(user, eq(gameFileDownload.userId, user.id))
    .orderBy(asc(user.name), asc(user.email));

  return games.map((item) => ({
    ...item,
    resources: resources.filter((resource) => resource.gameId === item.id),
    files: sortFilesByFilename(files.filter((file) => file.gameId === item.id)).map(
      (file) => {
        const fileDownloaders = downloaders
          .filter((downloader) => downloader.fileId === file.id)
          .map((downloader) => ({
            userId: downloader.userId,
            username: downloader.name || downloader.email,
            downloadedAt: downloader.downloadedAt,
          }));

        return {
          ...file,
          downloadCount: fileDownloaders.length,
          downloaders: fileDownloaders,
        };
      },
    ),
  }));
}

export async function getGameLibraryStats() {
  const [games] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(game)
    .where(eq(game.status, "active"));

  const [resources] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gameResource);
  const [files] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gameFile);

  return {
    games: games?.count ?? 0,
    resources: (resources?.count ?? 0) + (files?.count ?? 0),
  };
}
