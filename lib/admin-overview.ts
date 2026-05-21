import { desc, eq, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  game,
  gameFile,
  gameFileDownload,
  gameResource,
  invitationCode,
  session,
  user,
} from "@/schema";

export type AdminActivityItem = {
  id: string;
  at: Date | string;
  detail: string;
  title: string;
  type: "user" | "game" | "resource" | "file" | "invite";
};

function latestDate(values: Array<Date | string | null | undefined>) {
  const timestamps = values
    .filter((value): value is Date | string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);

  if (!timestamps.length) return null;

  return new Date(Math.max(...timestamps));
}

export async function getAdminOverview() {
  const [
    [userTotals],
    [activeSessions],
    [games],
    [archivedGames],
    [resources],
    [files],
    [storage],
    [downloads],
    [invitations],
    [openInvitations],
    [lastUser],
    [lastGame],
    [lastResource],
    [lastFile],
    [lastDownload],
    [lastInvitation],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(user),
    db.select({ count: sql<number>`count(*)::int` }).from(session),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(game)
      .where(eq(game.status, "active")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(game)
      .where(ne(game.status, "active")),
    db.select({ count: sql<number>`count(*)::int` }).from(gameResource),
    db.select({ count: sql<number>`count(*)::int` }).from(gameFile),
    db
      .select({
        total: sql<number>`coalesce(sum(${gameFile.sizeBytes}), 0)::bigint`,
      })
      .from(gameFile),
    db.select({ count: sql<number>`count(*)::int` }).from(gameFileDownload),
    db.select({ count: sql<number>`count(*)::int` }).from(invitationCode),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invitationCode)
      .where(
        sql`${invitationCode.usedAt} is null and ${invitationCode.revokedAt} is null`,
      ),
    db.select({ at: sql<Date | null>`max(${user.updatedAt})` }).from(user),
    db.select({ at: sql<Date | null>`max(${game.updatedAt})` }).from(game),
    db
      .select({ at: sql<Date | null>`max(${gameResource.updatedAt})` })
      .from(gameResource),
    db.select({ at: sql<Date | null>`max(${gameFile.updatedAt})` }).from(gameFile),
    db
      .select({ at: sql<Date | null>`max(${gameFileDownload.createdAt})` })
      .from(gameFileDownload),
    db
      .select({ at: sql<Date | null>`max(${invitationCode.updatedAt})` })
      .from(invitationCode),
  ]);

  const [
    recentUsers,
    recentGames,
    recentResources,
    recentFiles,
    recentInvitations,
  ] = await Promise.all([
    db
      .select({
        id: user.id,
        at: user.createdAt,
        email: user.email,
        name: user.name,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(4),
    db
      .select({
        id: game.id,
        at: game.updatedAt,
        status: game.status,
        title: game.title,
      })
      .from(game)
      .orderBy(desc(game.updatedAt))
      .limit(4),
    db
      .select({
        id: gameResource.id,
        at: gameResource.updatedAt,
        gameTitle: game.title,
        title: gameResource.title,
        type: gameResource.resourceType,
      })
      .from(gameResource)
      .innerJoin(game, eq(gameResource.gameId, game.id))
      .orderBy(desc(gameResource.updatedAt))
      .limit(4),
    db
      .select({
        id: gameFile.id,
        at: gameFile.updatedAt,
        filename: gameFile.filename,
        gameTitle: game.title,
      })
      .from(gameFile)
      .innerJoin(game, eq(gameFile.gameId, game.id))
      .orderBy(desc(gameFile.updatedAt))
      .limit(4),
    db
      .select({
        id: invitationCode.id,
        at: invitationCode.updatedAt,
        code: invitationCode.code,
        usedAt: invitationCode.usedAt,
        revokedAt: invitationCode.revokedAt,
      })
      .from(invitationCode)
      .orderBy(desc(invitationCode.updatedAt))
      .limit(4),
  ]);

  const activity: AdminActivityItem[] = [
    ...recentUsers.map((item) => ({
      id: item.id,
      at: item.at,
      detail: item.email,
      title: `New user ${item.name || "Unnamed user"}`,
      type: "user" as const,
    })),
    ...recentGames.map((item) => ({
      id: item.id,
      at: item.at,
      detail: item.status,
      title: `Game updated: ${item.title}`,
      type: "game" as const,
    })),
    ...recentResources.map((item) => ({
      id: item.id,
      at: item.at,
      detail: `${item.gameTitle} · ${item.type}`,
      title: `Resource changed: ${item.title}`,
      type: "resource" as const,
    })),
    ...recentFiles.map((item) => ({
      id: item.id,
      at: item.at,
      detail: item.gameTitle,
      title: `File changed: ${item.filename}`,
      type: "file" as const,
    })),
    ...recentInvitations.map((item) => ({
      id: item.id,
      at: item.at,
      detail: item.revokedAt ? "Revoked" : item.usedAt ? "Used" : "Open",
      title: `Invitation ${item.code}`,
      type: "invite" as const,
    })),
  ]
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
    .slice(0, 12);

  return {
    activity,
    lastChangedAt: latestDate([
      lastUser?.at,
      lastGame?.at,
      lastResource?.at,
      lastFile?.at,
      lastDownload?.at,
      lastInvitation?.at,
    ]),
    totals: {
      activeGames: games?.count ?? 0,
      activeSessions: activeSessions?.count ?? 0,
      archivedGames: archivedGames?.count ?? 0,
      downloads: downloads?.count ?? 0,
      files: files?.count ?? 0,
      invitations: invitations?.count ?? 0,
      openInvitations: openInvitations?.count ?? 0,
      resources: resources?.count ?? 0,
      storageBytes: Number(storage?.total ?? 0),
      users: userTotals?.count ?? 0,
    },
  };
}
