import { authQueryKeys } from "@better-auth-ui/core";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Boxes,
  FileArchive,
  Gamepad2,
  LinkIcon,
  Search,
  ShieldCheck,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentType } from "react";

import { UserButton } from "@/components/auth/user/user-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { getGameLibrary, getGameLibraryStats } from "@/lib/game-library";
import { getQueryClient } from "@/lib/query-client";
import { cn } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resourceIcon(type: string) {
  return type === "file" || type === "save" || type === "mod"
    ? FileArchive
    : LinkIcon;
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const queryClient = getQueryClient();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  queryClient.setQueryData(authQueryKeys.session, session);

  if (!session) {
    redirect("/auth/sign-in");
  }

  const search = firstParam(params.search)?.trim().toLowerCase() ?? "";
  const [library, stats] = await Promise.all([
    getGameLibrary(),
    getGameLibraryStats(),
  ]);
  const filteredLibrary = search
    ? library.filter((game) => {
        const haystack = [
          game.title,
          game.summary,
          game.platform,
          ...game.resources.flatMap((resource) => [
            resource.title,
            resource.description,
            resource.resourceType,
          ]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      })
    : library;

  const userRole =
    "role" in session.user ? (session.user.role as string | undefined) : "";
  const isAdmin = userRole?.split(",").includes("admin");

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="min-h-dvh bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tavern library</p>
              <h1 className="text-2xl font-semibold tracking-normal">
                Shared game files and links
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin ? (
                <Button variant="outline" asChild>
                  <Link href="/admin/games">
                    <ShieldCheck />
                    Manage library
                  </Link>
                </Button>
              ) : null}
              <UserButton size="icon" align="end" />
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Games"
              value={stats.games.toString()}
              note="Active collections"
              icon={Gamepad2}
            />
            <MetricCard
              title="Resources"
              value={stats.resources.toString()}
              note="Files, saves, tools, and links"
              icon={Boxes}
            />
            <Card>
              <CardHeader>
                <CardTitle>Find resources</CardTitle>
                <CardDescription>Search by game, platform, or link type.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex gap-2">
                  <Input name="search" defaultValue={search} placeholder="Search library" />
                  <Button type="submit" variant="outline" size="icon" aria-label="Search">
                    <Search />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>

          {filteredLibrary.length ? (
            <section className="grid gap-4 lg:grid-cols-2">
              {filteredLibrary.map((game) => (
                <Card key={game.id} className="min-h-full">
                  {game.coverUrl ? (
                    <div
                      aria-hidden="true"
                      className="h-44 w-full bg-muted bg-cover bg-center"
                      style={{ backgroundImage: `url(${game.coverUrl})` }}
                    />
                  ) : null}
                  <CardHeader>
                    <CardTitle>{game.title}</CardTitle>
                    <CardDescription>{game.summary}</CardDescription>
                    <CardAction>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {game.platform || "Any platform"}
                      </span>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {game.resources.length ? (
                      game.resources.map((resource) => {
                        const Icon = resourceIcon(resource.resourceType);

                        return (
                          <a
                            key={resource.id}
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                          >
                            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium">
                                  {resource.title}
                                </p>
                                <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                  {resource.resourceType}
                                </span>
                              </div>
                              {resource.description ? (
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {resource.description}
                                </p>
                              ) : null}
                            </div>
                            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                          </a>
                        );
                      })
                    ) : (
                      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No resources have been added for this game yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : (
            <Card>
              <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
                <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                  <Gamepad2 className="size-5" />
                </div>
                <div>
                  <p className="font-medium">
                    {search ? "No matching games" : "No games yet"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isAdmin
                      ? "Add the first game collection from the admin library."
                      : "An admin has not published any game collections yet."}
                  </p>
                </div>
                {isAdmin ? (
                  <Button asChild>
                    <Link href="/admin/games">Manage library</Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </HydrationBoundary>
  );
}

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: string;
  note: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{note}</CardDescription>
        <CardAction>
          <div className="flex size-8 items-center justify-center rounded-md bg-muted">
            <Icon className={cn("size-4")} />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
