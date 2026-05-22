"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { DashboardHeader } from "@/components/game-library/dashboard-header";
import { GameCard } from "@/components/game-library/game-card";
import { GameLibraryEmptyState } from "@/components/game-library/game-library-empty-state";
import { LibraryOverview } from "@/components/game-library/library-overview";
import { gameMatchesSearch } from "@/components/game-library/library-utils";
import type { GameWithResources } from "@/lib/game-library";

type GameLibraryDashboardProps = {
  isAdmin: boolean;
  library: GameWithResources[];
  stats: {
    games: number;
    resources: number;
  };
};

export function GameLibraryDashboard({
  isAdmin,
  library,
  stats,
}: GameLibraryDashboardProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredLibrary = useMemo(
    () => library.filter((game) => gameMatchesSearch(game, deferredSearch)),
    [deferredSearch, library],
  );

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        <DashboardHeader />
        <LibraryOverview
          search={search}
          stats={stats}
          onSearchChange={setSearch}
        />

        {filteredLibrary.length ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {filteredLibrary.map((game) => (
              <GameCard key={game.id} game={game} isAdmin={isAdmin} />
            ))}
          </section>
        ) : (
          <GameLibraryEmptyState isAdmin={isAdmin} search={search} />
        )}
      </div>
    </main>
  );
}
