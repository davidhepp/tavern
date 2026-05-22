"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { touchGame } from "@/lib/game-activity";
import { game, gameResource } from "@/schema";

function valueFrom(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function resourceTypeFrom(formData: FormData) {
  const value = valueFrom(formData, "resourceType");
  return ["file", "game files", "guide", "mod", "save", "tool"].includes(value)
    ? value
    : "link";
}

function adminGamesUrl({
  gameId,
  success,
  error,
}: {
  gameId?: string;
  success?: string;
  error?: string;
}) {
  const params = new URLSearchParams();

  if (gameId) params.set("gameId", gameId);
  if (success) params.set("success", success);
  if (error) params.set("error", error);

  const query = params.toString();
  return query ? `/admin/games?${query}` : "/admin/games";
}

async function requireAdmin() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect("/auth/sign-in");
  }

  const role =
    "role" in session.user ? (session.user.role as string | undefined) : "";

  if (!role?.split(",").includes("admin")) {
    forbidden();
  }

  return session;
}

export async function createGameAction(formData: FormData) {
  const session = await requireAdmin();
  const title = valueFrom(formData, "title");
  const slug = slugify(title);
  const id = crypto.randomUUID();

  try {
    await db.insert(game).values({
      id,
      title,
      slug,
      summary: valueFrom(formData, "summary") || null,
      coverUrl: valueFrom(formData, "coverUrl") || null,
      platform: valueFrom(formData, "platform") || null,
      status: valueFrom(formData, "status") || "active",
      createdBy: session.user.id,
      updatedBy: session.user.id,
    });
  } catch {
    redirect(adminGamesUrl({ error: "game-create-failed" }));
  }

  revalidatePath("/");
  revalidatePath("/admin/games");
  redirect(adminGamesUrl({ gameId: id, success: "game-created" }));
}

export async function updateGameAction(formData: FormData) {
  const session = await requireAdmin();
  const id = valueFrom(formData, "gameId");
  const title = valueFrom(formData, "title");
  const slug = slugify(title);

  try {
    await db
      .update(game)
      .set({
        title,
        slug,
        summary: valueFrom(formData, "summary") || null,
        coverUrl: valueFrom(formData, "coverUrl") || null,
        platform: valueFrom(formData, "platform") || null,
        status: valueFrom(formData, "status") || "active",
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(game.id, id));
  } catch {
    redirect(adminGamesUrl({ gameId: id, error: "game-update-failed" }));
  }

  revalidatePath("/");
  revalidatePath("/admin/games");
  redirect(adminGamesUrl({ gameId: id, success: "game-updated" }));
}

export async function deleteGameAction(formData: FormData) {
  await requireAdmin();
  const id = valueFrom(formData, "gameId");

  try {
    await db.delete(game).where(eq(game.id, id));
  } catch {
    redirect(adminGamesUrl({ gameId: id, error: "game-delete-failed" }));
  }

  revalidatePath("/");
  revalidatePath("/admin/games");
  redirect(adminGamesUrl({ success: "game-deleted" }));
}

export async function createResourceAction(formData: FormData) {
  const session = await requireAdmin();
  const gameId = valueFrom(formData, "gameId");

  try {
    await db.insert(gameResource).values({
      id: crypto.randomUUID(),
      gameId,
      title: valueFrom(formData, "title"),
      url: valueFrom(formData, "url"),
      resourceType: resourceTypeFrom(formData),
      description: valueFrom(formData, "description") || null,
      sortOrder: Number(valueFrom(formData, "sortOrder")) || 0,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    });
    await touchGame(gameId, session.user.id);
  } catch {
    redirect(adminGamesUrl({ gameId, error: "resource-create-failed" }));
  }

  revalidatePath("/");
  revalidatePath("/admin/games");
  redirect(adminGamesUrl({ gameId, success: "resource-created" }));
}

export async function updateResourceAction(formData: FormData) {
  const session = await requireAdmin();
  const gameId = valueFrom(formData, "gameId");

  try {
    await db
      .update(gameResource)
      .set({
        title: valueFrom(formData, "title"),
        url: valueFrom(formData, "url"),
        resourceType: resourceTypeFrom(formData),
        description: valueFrom(formData, "description") || null,
        sortOrder: Number(valueFrom(formData, "sortOrder")) || 0,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(gameResource.id, valueFrom(formData, "resourceId")));
    await touchGame(gameId, session.user.id);
  } catch {
    redirect(adminGamesUrl({ gameId, error: "resource-update-failed" }));
  }

  revalidatePath("/");
  revalidatePath("/admin/games");
  redirect(adminGamesUrl({ gameId, success: "resource-updated" }));
}

export async function deleteResourceAction(formData: FormData) {
  const session = await requireAdmin();
  const gameId = valueFrom(formData, "gameId");

  try {
    await db
      .delete(gameResource)
      .where(eq(gameResource.id, valueFrom(formData, "resourceId")));
    await touchGame(gameId, session.user.id);
  } catch {
    redirect(adminGamesUrl({ gameId, error: "resource-delete-failed" }));
  }

  revalidatePath("/");
  revalidatePath("/admin/games");
  redirect(adminGamesUrl({ gameId, success: "resource-deleted" }));
}
