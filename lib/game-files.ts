import { and, asc, eq, ne, sql } from "drizzle-orm";

import {
  MAX_GAME_STORAGE_BYTES,
  MULTIPART_PART_SIZE_BYTES,
  sanitizeFilename,
} from "@/lib/game-file-constraints";
import { db } from "@/lib/db";
import { game, gameFile, gameFileDownload } from "@/schema";

export type GameFile = typeof gameFile.$inferSelect;

const filenameSorter = new Intl.Collator("en-US", {
  numeric: true,
  sensitivity: "base",
});

export async function getGameFiles(gameId: string) {
  const files = await db
    .select()
    .from(gameFile)
    .where(eq(gameFile.gameId, gameId))
    .orderBy(asc(gameFile.filename));

  return files.sort((left, right) =>
    filenameSorter.compare(left.filename, right.filename),
  );
}

export async function getGameFile(fileId: string) {
  const [record] = await db
    .select()
    .from(gameFile)
    .where(eq(gameFile.id, fileId))
    .limit(1);

  return record;
}

export async function recordGameFileDownload({
  fileId,
  userId,
}: {
  fileId: string;
  userId: string;
}) {
  await db
    .insert(gameFileDownload)
    .values({
      id: crypto.randomUUID(),
      fileId,
      userId,
    })
    .onConflictDoUpdate({
      target: [gameFileDownload.fileId, gameFileDownload.userId],
      set: {
        updatedAt: new Date(),
      },
    });
}

export async function getGameStorageBytes(
  gameId: string,
  excludeFileId?: string,
) {
  const filters = [eq(gameFile.gameId, gameId)];

  if (excludeFileId) {
    filters.push(ne(gameFile.id, excludeFileId));
  }

  const [result] = await db
    .select({ total: sql<number>`coalesce(sum(${gameFile.sizeBytes}), 0)::bigint` })
    .from(gameFile)
    .where(and(...filters));

  return Number(result?.total ?? 0);
}

export async function gameExists(gameId: string) {
  const [record] = await db
    .select({ id: game.id })
    .from(game)
    .where(eq(game.id, gameId))
    .limit(1);

  return Boolean(record);
}

export async function ensureGameQuota(gameId: string, incomingBytes: number) {
  const currentBytes = await getGameStorageBytes(gameId);

  if (currentBytes + incomingBytes > MAX_GAME_STORAGE_BYTES) {
    return "This upload would exceed the 15GB storage limit for the game.";
  }

  return null;
}

export function buildStorageKey({
  gameId,
  filename,
}: {
  gameId: string;
  filename: string;
}) {
  const safeName = sanitizeFilename(filename);
  return `games/${gameId}/${crypto.randomUUID()}-${safeName}`;
}

export function multipartPartCount(sizeBytes: number) {
  return Math.ceil(sizeBytes / MULTIPART_PART_SIZE_BYTES);
}
