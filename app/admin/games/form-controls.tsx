"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const platformOptions = [
  "PC",
  "Steam Deck",
  "PlayStation",
  "Xbox",
  "Switch",
  "Mobile",
  "Web",
];

const resourceTypes = [
  "link",
  "file",
  "game files",
  "guide",
  "mod",
  "save",
  "tool",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function TitleInput({
  defaultValue = "",
  placeholder,
}: {
  defaultValue?: string;
  placeholder?: string;
}) {
  const [title, setTitle] = useState(defaultValue);

  return (
    <div className="grid gap-1.5">
      <Input
        name="title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        placeholder={placeholder}
      />
      <p className="text-xs text-muted-foreground">
        Slug:{" "}
        <span className="font-medium">
          {slugify(title) || "generated-from-title"}
        </span>
      </p>
    </div>
  );
}

export function PlatformMultiSelect({
  defaultValue,
  name = "platform",
}: {
  defaultValue?: string | null;
  name?: string;
}) {
  const initialValue = useMemo(
    () =>
      new Set(
        (defaultValue ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    [defaultValue],
  );
  const [selected, setSelected] = useState(initialValue);
  const value = Array.from(selected).join(", ");

  function toggle(platform: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(platform)) {
        next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
  }

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
          >
            <span className="truncate">{value || "Select platforms"}</span>
            <ChevronDown className="size-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Platforms</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {platformOptions.map((platform) => (
            <DropdownMenuCheckboxItem
              key={platform}
              checked={selected.has(platform)}
              onCheckedChange={() => toggle(platform)}
              onSelect={(event) => event.preventDefault()}
            >
              {platform}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function ResourceTypeSelect({
  defaultValue = "link",
  name = "resourceType",
}: {
  defaultValue?: string | null;
  name?: string;
}) {
  const [value, setValue] = useState(defaultValue || "link");

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          {resourceTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
