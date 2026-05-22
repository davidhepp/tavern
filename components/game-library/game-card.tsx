import {
  ArrowUpRight,
  Clock3,
  Download,
  FileArchive,
  Settings,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format-date";
import { formatBytes } from "@/lib/game-file-constraints";
import type { GameWithResources } from "@/lib/game-library";
import { cn } from "@/lib/utils";

import { latestGameUpdate, resourceIcon } from "./library-utils";

type GameCardProps = {
  game: GameWithResources;
  isAdmin: boolean;
};

export function GameCard({ game, isAdmin }: GameCardProps) {
  const updatedAt = latestGameUpdate(game);

  return (
    <Card className="min-h-full">
      {game.coverUrl ? (
        <GameCover coverUrl={game.coverUrl}>
          <UpdatedBadge updatedAt={updatedAt} className="absolute left-2 top-2" />
          {isAdmin ? (
            <AdminGameLink
              game={game}
              className="absolute right-2 top-2 bg-background/90 shadow-sm backdrop-blur-sm"
            />
          ) : null}
        </GameCover>
      ) : null}
      <CardHeader>
        <CardTitle>{game.title}</CardTitle>
        {game.summary ? (
          <CardDescription>{game.summary}</CardDescription>
        ) : null}
        {!game.coverUrl ? (
          <CardAction>
            <div className="flex flex-wrap justify-end gap-2">
              {isAdmin ? <AdminGameLink game={game} /> : null}
              <UpdatedBadge updatedAt={updatedAt} />
            </div>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <DownloadList files={game.files} />
        <ResourceList
          resources={game.resources}
          hasFiles={game.files.length > 0}
        />
      </CardContent>
    </Card>
  );
}

function GameCover({
  children,
  coverUrl,
}: {
  children?: ReactNode;
  coverUrl: string;
}) {
  return (
    <div className="-mt-4 px-2 pt-2">
      <div
        className="relative h-44 w-full rounded-lg bg-muted bg-cover bg-position-[center_38%]"
        style={{ backgroundImage: `url(${coverUrl})` }}
      >
        {children}
      </div>
    </div>
  );
}

function UpdatedBadge({
  className,
  updatedAt,
}: {
  className?: string;
  updatedAt: Date;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs text-foreground shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <Clock3 className="size-3" />
      Updated {formatDateTime(updatedAt)}
    </span>
  );
}

function AdminGameLink({
  className,
  game,
}: {
  className?: string;
  game: GameWithResources;
}) {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      className={className}
      aria-label={`Configure ${game.title}`}
      asChild
    >
      <Link href={`/admin/games?gameId=${game.id}`}>
        <Settings />
      </Link>
    </Button>
  );
}

function DownloadList({ files }: { files: GameWithResources["files"] }) {
  if (!files.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileArchive className="size-4" />
        Downloads
      </div>
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-3 rounded-lg border p-3"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileArchive className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.filename}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatBytes(file.sizeBytes)} · Uploaded{" "}
              {formatDateTime(file.createdAt)}
            </p>
          </div>
          <Button size="sm" asChild>
            <a href={`/api/game-files/${file.id}/download`}>
              <Download />
              Download
            </a>
          </Button>
        </div>
      ))}
    </div>
  );
}

function ResourceList({
  resources,
  hasFiles,
}: {
  resources: GameWithResources["resources"];
  hasFiles: boolean;
}) {
  if (!resources.length) {
    return hasFiles ? null : (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No resources have been added for this game yet.
      </p>
    );
  }

  return resources.map((resource) => {
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
            <p className="truncate text-sm font-medium">{resource.title}</p>
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
  });
}
