"use client";

import {
  ArrowUpRight,
  Boxes,
  FileArchive,
  Gamepad2,
  LinkIcon,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
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
import type { GameWithResources } from "@/lib/game-library";
import { cn } from "@/lib/utils";

type GameLibraryDashboardProps = {
  isAdmin: boolean;
  library: GameWithResources[];
  stats: {
    games: number;
    resources: number;
  };
};

function resourceIcon(type: string) {
  return type === "file" || type === "save" || type === "mod"
    ? FileArchive
    : LinkIcon;
}

export function GameLibraryDashboard({
  isAdmin,
  library,
  stats,
}: GameLibraryDashboardProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredLibrary = useMemo(() => {
    if (!deferredSearch) return library;

    return library.filter((game) => {
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

      return haystack.includes(deferredSearch);
    });
  }, [deferredSearch, library]);

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Tavern</p>
            <h1 className="text-2xl font-semibold tracking-normal">
              Game Library
            </h1>
          </div>

          <div className="flex items-center gap-2">
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
              <CardDescription>
                Search locally by game, platform, or link type.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search library"
                />
                <Button variant="outline" size="icon" aria-label="Search">
                  <Search />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {filteredLibrary.length ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {filteredLibrary.map((game) => (
              <Card key={game.id} className="min-h-full">
                {game.coverUrl ? (
                  <div className="-mt-4 px-2 pt-2">
                    <div
                      aria-hidden="true"
                      className="h-44 w-full rounded-lg bg-muted bg-cover bg-[center_38%]"
                      style={{ backgroundImage: `url(${game.coverUrl})` }}
                    />
                  </div>
                ) : null}
                <CardHeader>
                  <CardTitle>{game.title}</CardTitle>
                  {game.summary ? (
                    <CardDescription>{game.summary}</CardDescription>
                  ) : null}
                  <CardAction>
                    <div className="flex flex-wrap justify-end gap-2">
                      {isAdmin ? (
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Configure ${game.title}`}
                          asChild
                        >
                          <Link href={`/admin/games?gameId=${game.id}`}>
                            <Settings />
                          </Link>
                        </Button>
                      ) : null}
                      <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {game.platform || "Any platform"}
                      </span>
                    </div>
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
