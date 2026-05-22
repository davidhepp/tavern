import { Boxes, Gamepad2, Search } from "lucide-react";
import type { ComponentType } from "react";

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
import { cn } from "@/lib/utils";

type LibraryOverviewProps = {
  search: string;
  stats: {
    games: number;
    resources: number;
  };
  onSearchChange: (value: string) => void;
};

export function LibraryOverview({
  search,
  stats,
  onSearchChange,
}: LibraryOverviewProps) {
  return (
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
            Search by game, filename, or link type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search library"
            />
            <Button variant="outline" size="icon" aria-label="Search">
              <Search />
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
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
