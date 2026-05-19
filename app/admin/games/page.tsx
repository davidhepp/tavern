import { authQueryKeys } from "@better-auth-ui/core";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileArchive,
  Gamepad2,
  LinkIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { forbidden, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { UserButton } from "@/components/auth/user/user-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  createGameAction,
  createResourceAction,
  deleteGameAction,
  deleteResourceAction,
  updateGameAction,
  updateResourceAction,
} from "@/app/admin/games/actions";
import { auth } from "@/lib/auth";
import { getGameLibrary } from "@/lib/game-library";
import { getQueryClient } from "@/lib/query-client";

export default async function AdminGamesPage() {
  const requestHeaders = await headers();
  const queryClient = getQueryClient();
  const session = await auth.api.getSession({ headers: requestHeaders });
  queryClient.setQueryData(authQueryKeys.session, session);

  if (!session) {
    redirect("/auth/sign-in");
  }

  const role =
    "role" in session.user ? (session.user.role as string | undefined) : "";

  if (!role?.split(",").includes("admin")) {
    forbidden();
  }

  const library = await getGameLibrary({ includeArchived: true });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="min-h-dvh bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Button variant="outline" size="sm" asChild className="mb-3">
                <Link href="/">
                  <ArrowLeft />
                  Dashboard
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">Admin library</p>
              <h1 className="text-2xl font-semibold tracking-normal">
                Manage games and resources
              </h1>
            </div>
            <UserButton size="icon" align="end" />
          </header>

          <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
            <div className="flex flex-col gap-4">
              <CreateGameCard />
            </div>

            <div className="grid gap-4">
              {library.length ? (
                library.map((game) => (
                  <Card key={game.id}>
                    <CardHeader>
                      <CardTitle>{game.title}</CardTitle>
                      <CardDescription>{game.summary}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <GameForm game={game} />

                      <Separator />

                      <div className="grid gap-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Gamepad2 className="size-4" />
                          Resources
                        </div>
                        <CreateResourceForm gameId={game.id} />
                        {game.resources.length ? (
                          game.resources.map((resource) => (
                            <ResourceForm
                              key={resource.id}
                              resource={resource}
                            />
                          ))
                        ) : (
                          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            No resources yet. Add one with the form on the left.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
                    <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                      <Gamepad2 className="size-5" />
                    </div>
                    <div>
                      <p className="font-medium">No games yet</p>
                      <p className="text-sm text-muted-foreground">
                        Create a game collection to start sharing links and files.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        </div>
      </main>
    </HydrationBoundary>
  );
}

function CreateGameCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create game</CardTitle>
        <CardDescription>
          Add a collection that users can browse from the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createGameAction} className="grid gap-3">
          <Field label="Title">
            <Input name="title" required placeholder="Baldur's Gate 3" />
          </Field>
          <Field label="Slug">
            <Input name="slug" placeholder="baldurs-gate-3" />
          </Field>
          <Field label="Summary">
            <Textarea name="summary" required placeholder="Shared saves, mod lists, and table notes." />
          </Field>
          <Field label="Cover URL">
            <Input name="coverUrl" type="url" placeholder="https://..." />
          </Field>
          <Field label="Platform">
            <Input name="platform" placeholder="PC, Steam Deck, Switch" />
          </Field>
          <Field label="Status">
            <Input name="status" defaultValue="active" />
          </Field>
          <Button type="submit">
            <Plus />
            Create game
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function GameForm({
  game,
}: {
  game: Awaited<ReturnType<typeof getGameLibrary>>[number];
}) {
  return (
    <form action={updateGameAction} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="gameId" value={game.id} />
      <Field label="Title">
        <Input name="title" defaultValue={game.title} required />
      </Field>
      <Field label="Slug">
        <Input name="slug" defaultValue={game.slug} required />
      </Field>
      <Field label="Summary">
        <Textarea name="summary" defaultValue={game.summary} required />
      </Field>
      <div className="grid gap-3">
        <Field label="Cover URL">
          <Input name="coverUrl" type="url" defaultValue={game.coverUrl ?? ""} />
        </Field>
        <Field label="Platform">
          <Input name="platform" defaultValue={game.platform ?? ""} />
        </Field>
        <Field label="Status">
          <Input name="status" defaultValue={game.status} />
        </Field>
      </div>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" variant="outline">
          <Pencil />
          Save game
        </Button>
        <Button
          formAction={deleteGameAction}
          type="submit"
          variant="destructive"
        >
          <Trash2 />
          Delete game
        </Button>
      </div>
    </form>
  );
}

function CreateResourceForm({ gameId }: { gameId: string }) {
  return (
    <form action={createResourceAction} className="rounded-lg border bg-muted/20 p-3">
      <input type="hidden" name="gameId" value={gameId} />
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Plus className="size-4" />
        Add resource
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Title">
          <Input name="title" required placeholder="Patch notes" />
        </Field>
        <Field label="URL">
          <Input name="url" type="url" required placeholder="https://..." />
        </Field>
        <Field label="Type">
          <Input name="resourceType" defaultValue="link" />
        </Field>
        <Field label="Sort order">
          <Input name="sortOrder" type="number" defaultValue="0" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <Textarea name="description" placeholder="Short context for players." />
          </Field>
        </div>
      </div>
      <Button type="submit" size="sm" className="mt-3">
        <Plus />
        Add resource
      </Button>
    </form>
  );
}

function ResourceForm({
  resource,
}: {
  resource: Awaited<ReturnType<typeof getGameLibrary>>[number]["resources"][number];
}) {
  const Icon =
    resource.resourceType === "file" ||
    resource.resourceType === "save" ||
    resource.resourceType === "mod"
      ? FileArchive
      : LinkIcon;

  return (
    <form action={updateResourceAction} className="rounded-lg border p-3">
      <input type="hidden" name="resourceId" value={resource.id} />
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4" />
        {resource.title}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Title">
          <Input name="title" defaultValue={resource.title} required />
        </Field>
        <Field label="URL">
          <Input name="url" type="url" defaultValue={resource.url} required />
        </Field>
        <Field label="Type">
          <Input name="resourceType" defaultValue={resource.resourceType} />
        </Field>
        <Field label="Sort order">
          <Input
            name="sortOrder"
            type="number"
            defaultValue={resource.sortOrder}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <Textarea
              name="description"
              defaultValue={resource.description ?? ""}
            />
          </Field>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" variant="outline" size="sm">
          <Pencil />
          Save resource
        </Button>
        <Button
          formAction={deleteResourceAction}
          type="submit"
          variant="destructive"
          size="sm"
        >
          <Trash2 />
          Delete
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
