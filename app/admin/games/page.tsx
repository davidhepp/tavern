import { authQueryKeys } from "@better-auth-ui/core";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
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

import { AdminNav } from "@/app/admin/admin-nav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
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
import { GameActionToaster } from "@/app/admin/games/action-toaster";
import { FileUploadManager } from "@/app/admin/games/file-upload-manager";
import {
  PlatformMultiSelect,
  ResourceTypeSelect,
  TitleInput,
} from "@/app/admin/games/form-controls";
import { auth } from "@/lib/auth";
import { getDeployVersion } from "@/lib/deploy-version";
import { getGameLibrary } from "@/lib/game-library";
import { getQueryClient } from "@/lib/query-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminGamesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
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
  const selectedGameId = firstParam(params.gameId);
  const success = firstParam(params.success);
  const error = firstParam(params.error);
  const selectedGame =
    library.find((game) => game.id === selectedGameId) ?? library[0];

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GameActionToaster success={success} error={error} />
      <main className="min-h-dvh bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <AdminNav deployVersion={getDeployVersion()} />

          <header>
            <div>
              <p className="text-sm text-muted-foreground">Admin library</p>
              <h1 className="text-2xl font-semibold tracking-normal">
                Manage games and resources
              </h1>
            </div>
          </header>

          <section className="grid gap-4 xl:grid-cols-[380px_1fr]">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Games</CardTitle>
                  <CardDescription>
                    Select a game to edit its details and resources.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {library.length ? (
                    library.map((game) => (
                      <Button
                        key={game.id}
                        variant={selectedGame?.id === game.id ? "default" : "outline"}
                        className="h-auto w-full justify-start px-3 py-2"
                        asChild
                      >
                        <Link href={`/admin/games?gameId=${game.id}`}>
                          <div className="min-w-0 text-left">
                            <p className="truncate text-sm font-medium">
                              {game.title}
                            </p>
                            <p className="truncate text-xs opacity-75">
                              {game.platform || "Any platform"} · {game.resources.length} resources, {game.files.length} files
                            </p>
                          </div>
                        </Link>
                      </Button>
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No games yet.
                    </p>
                  )}
                </CardContent>
              </Card>
              <CreateGameCard />
            </div>

            <div className="grid gap-4">
              {selectedGame ? (
                <Card key={selectedGame.id}>
                  <CardHeader>
                    <CardTitle>{selectedGame.title}</CardTitle>
                    {selectedGame.summary ? (
                      <CardDescription>{selectedGame.summary}</CardDescription>
                    ) : (
                      <CardDescription>
                        Edit this game collection and its shared resources.
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <GameForm game={selectedGame} />

                    <Separator />

                    <div className="grid gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileArchive className="size-4" />
                        Private downloads
                      </div>
                      <FileUploadManager
                        games={library}
                        selectedGameId={selectedGame.id}
                      />
                    </div>

                    <Separator />

                    <div className="grid gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Gamepad2 className="size-4" />
                        Resources
                      </div>
                      <CreateResourceForm gameId={selectedGame.id} />
                      {selectedGame.resources.length ? (
                        selectedGame.resources.map((resource) => (
                          <ResourceForm key={resource.id} resource={resource} />
                        ))
                      ) : (
                        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          No resources yet. Add one above.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
            <TitleInput placeholder="Baldur's Gate 3" />
          </Field>
          <Field label="Summary">
            <Textarea name="summary" placeholder="Optional context for this collection." />
          </Field>
          <Field label="Cover URL">
            <Input name="coverUrl" type="url" placeholder="https://..." />
          </Field>
          <Field label="Platform">
            <PlatformMultiSelect />
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
        <TitleInput defaultValue={game.title} />
      </Field>
      <Field label="Summary">
        <Textarea name="summary" defaultValue={game.summary ?? ""} />
      </Field>
      <div className="grid gap-3">
        <Field label="Cover URL">
          <Input name="coverUrl" type="url" defaultValue={game.coverUrl ?? ""} />
        </Field>
        <Field label="Platform">
          <PlatformMultiSelect defaultValue={game.platform} />
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
        <ConfirmSubmitButton
          formAction={deleteGameAction}
          variant="destructive"
          confirmTitle="Delete this game?"
          confirmDescription={`This removes ${game.title} and all of its resources.`}
          confirmLabel="Delete"
        >
          <Trash2 />
          Delete game
        </ConfirmSubmitButton>
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
          <ResourceTypeSelect />
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
      <input type="hidden" name="gameId" value={resource.gameId} />
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
          <ResourceTypeSelect defaultValue={resource.resourceType} />
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
        <ConfirmSubmitButton
          formAction={deleteResourceAction}
          variant="destructive"
          size="sm"
          confirmTitle="Delete this resource?"
          confirmDescription={`This removes ${resource.title} from the game library.`}
          confirmLabel="Delete"
        >
          <Trash2 />
          Delete
        </ConfirmSubmitButton>
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
