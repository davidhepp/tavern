"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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
  return ["file", "guide", "mod", "save", "tool"].includes(value)
    ? value
    : "link";
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
  const explicitSlug = valueFrom(formData, "slug");
  const slug = slugify(explicitSlug || title);

  await db.insert(game).values({
    id: crypto.randomUUID(),
    title,
    slug,
    summary: valueFrom(formData, "summary"),
    coverUrl: valueFrom(formData, "coverUrl") || null,
    platform: valueFrom(formData, "platform") || null,
    status: valueFrom(formData, "status") || "active",
    createdBy: session.user.id,
    updatedBy: session.user.id,
  });

  revalidatePath("/");
  revalidatePath("/admin/games");
}

export async function updateGameAction(formData: FormData) {
  const session = await requireAdmin();
  const id = valueFrom(formData, "gameId");
  const title = valueFrom(formData, "title");
  const explicitSlug = valueFrom(formData, "slug");
  const slug = slugify(explicitSlug || title);

  await db
    .update(game)
    .set({
      title,
      slug,
      summary: valueFrom(formData, "summary"),
      coverUrl: valueFrom(formData, "coverUrl") || null,
      platform: valueFrom(formData, "platform") || null,
      status: valueFrom(formData, "status") || "active",
      updatedBy: session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(game.id, id));

  revalidatePath("/");
  revalidatePath("/admin/games");
}

export async function deleteGameAction(formData: FormData) {
  await requireAdmin();

  await db.delete(game).where(eq(game.id, valueFrom(formData, "gameId")));

  revalidatePath("/");
  revalidatePath("/admin/games");
}

export async function createResourceAction(formData: FormData) {
  const session = await requireAdmin();

  await db.insert(gameResource).values({
    id: crypto.randomUUID(),
    gameId: valueFrom(formData, "gameId"),
    title: valueFrom(formData, "title"),
    url: valueFrom(formData, "url"),
    resourceType: resourceTypeFrom(formData),
    description: valueFrom(formData, "description") || null,
    sortOrder: Number(valueFrom(formData, "sortOrder")) || 0,
    createdBy: session.user.id,
    updatedBy: session.user.id,
  });

  revalidatePath("/");
  revalidatePath("/admin/games");
}

export async function updateResourceAction(formData: FormData) {
  const session = await requireAdmin();

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

  revalidatePath("/");
  revalidatePath("/admin/games");
}

export async function deleteResourceAction(formData: FormData) {
  await requireAdmin();

  await db
    .delete(gameResource)
    .where(eq(gameResource.id, valueFrom(formData, "resourceId")));

  revalidatePath("/");
  revalidatePath("/admin/games");
}
