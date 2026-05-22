import { FileArchive, LinkIcon } from "lucide-react";

import { appDate } from "@/lib/format-date";
import type { GameWithResources } from "@/lib/game-library";

export function resourceIcon(type: string) {
  return type === "file" || type === "save" || type === "mod"
    ? FileArchive
    : LinkIcon;
}

export function latestGameUpdate(game: GameWithResources) {
  const timestamps = [
    game.updatedAt,
    ...game.files.map((file) => file.updatedAt),
    ...game.resources.map((resource) => resource.updatedAt),
  ].map((value) => appDate(value).getTime());

  return new Date(Math.max(...timestamps));
}

export function gameMatchesSearch(game: GameWithResources, search: string) {
  if (!search) return true;

  const haystack = [
    game.title,
    game.summary,
    ...game.files.map((file) => file.filename),
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
}
