"use client";

import { FileArchive, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format-date";
import {
  formatBytes,
  MAX_GAME_FILE_BYTES,
  MULTIPART_PART_SIZE_BYTES,
  validateGameFileInput,
} from "@/lib/game-file-constraints";
import type { GameWithResources } from "@/lib/game-library";

type UploadState = {
  file: File | null;
  progress: number;
  status: "idle" | "uploading" | "complete" | "error";
  message: string;
};

type UploadInitResponse = {
  uploadId: string;
  storageKey: string;
  filename: string;
  partSizeBytes: number;
  parts: { partNumber: number; url: string }[];
};

export function FileUploadManager({
  games,
  selectedGameId,
}: {
  games: GameWithResources[];
  selectedGameId?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [gameId, setGameId] = useState(selectedGameId ?? games[0]?.id ?? "");
  const [upload, setUpload] = useState<UploadState>({
    file: null,
    progress: 0,
    status: "idle",
    message: "",
  });
  const selectedGame = useMemo(
    () => games.find((game) => game.id === gameId),
    [gameId, games],
  );

  function selectFile(file: File | null) {
    if (!file) return;

    const mimeType = file.type || "application/octet-stream";
    const error = validateGameFileInput({
      filename: file.name,
      mimeType,
      sizeBytes: file.size,
    });

    if (error) {
      setUpload({ file, progress: 0, status: "error", message: error });
      return;
    }

    setUpload({ file, progress: 0, status: "idle", message: "" });
  }

  async function uploadPart(url: string, blob: Blob, onProgress: (loaded: number) => void) {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("PUT", url);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const etag = xhr.getResponseHeader("etag");
          if (!etag) {
            reject(new Error("Backblaze did not expose an ETag header."));
            return;
          }
          resolve(etag);
          return;
        }

        const responseText = xhr.responseText.trim();
        reject(
          new Error(
            responseText
              ? `Part upload failed with status ${xhr.status}: ${responseText}`
              : `Part upload failed with status ${xhr.status}.`,
          ),
        );
      };
      xhr.onerror = () =>
        reject(
          new Error(
            "Part upload failed. Check the browser Network tab for a blocked Backblaze request; this is often caused by bucket CORS settings.",
          ),
        );
      xhr.send(blob);
    });
  }

  async function startUpload() {
    if (!upload.file || !gameId) return;

    const file = upload.file;
    const mimeType = file.type || "application/octet-stream";

    setUpload((current) => ({
      ...current,
      progress: 0,
      status: "uploading",
      message: "Preparing upload...",
    }));

    try {
      const initResponse = await fetch("/api/admin/game-files/uploads/init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gameId,
          filename: file.name,
          mimeType,
          sizeBytes: file.size,
        }),
      });

      if (!initResponse.ok) {
        const body = (await initResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Upload initialization failed.");
      }

      const init = (await initResponse.json()) as UploadInitResponse;
      const uploadedByPart = new Map<number, number>();
      const completedParts = [];

      for (const part of init.parts) {
        const start = (part.partNumber - 1) * MULTIPART_PART_SIZE_BYTES;
        const end = Math.min(start + MULTIPART_PART_SIZE_BYTES, file.size);
        const blob = file.slice(start, end);
        const etag = await uploadPart(part.url, blob, (loaded) => {
          uploadedByPart.set(part.partNumber, loaded);
          const totalLoaded = Array.from(uploadedByPart.values()).reduce(
            (total, value) => total + value,
            0,
          );

          setUpload((current) => ({
            ...current,
            progress: Math.min(99, Math.round((totalLoaded / file.size) * 100)),
            message: `Uploading part ${part.partNumber} of ${init.parts.length}...`,
          }));
        });

        uploadedByPart.set(part.partNumber, blob.size);
        completedParts.push({ partNumber: part.partNumber, etag });
      }

      const completeResponse = await fetch(
        "/api/admin/game-files/uploads/complete",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            gameId,
            filename: init.filename,
            mimeType,
            sizeBytes: file.size,
            storageKey: init.storageKey,
            uploadId: init.uploadId,
            parts: completedParts,
          }),
        },
      );

      if (!completeResponse.ok) {
        const body = (await completeResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Upload completion failed.");
      }

      setUpload({
        file: null,
        progress: 100,
        status: "complete",
        message: "Upload complete.",
      });
      toast.success("File uploaded.");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (error) {
      setUpload((current) => ({
        ...current,
        status: "error",
        message: error instanceof Error ? error.message : "Upload failed.",
      }));
    }
  }

  async function deleteFile(fileId: string) {
    const response = await fetch(`/api/admin/game-files/${fileId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      toast.error(body?.error ?? "Delete failed.");
      return;
    }

    toast.success("File deleted.");
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div
        className="rounded-lg border border-dashed bg-muted/20 p-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          selectFile(event.dataTransfer.files.item(0));
        }}
      >
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Game</Label>
              <Select value={gameId} onValueChange={setGameId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select game" />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>File</Label>
              <Input
                ref={inputRef}
                type="file"
                onChange={(event) => selectFile(event.currentTarget.files?.item(0) ?? null)}
              />
            </div>
          </div>
          <Button
            type="button"
            disabled={
              !upload.file ||
              !gameId ||
              upload.status === "uploading" ||
              upload.file.size > MAX_GAME_FILE_BYTES
            }
            onClick={startUpload}
          >
            <UploadCloud />
            Upload
          </Button>
        </div>

        <div className="mt-3 min-h-10 rounded-md bg-background p-3 text-sm">
          {upload.file ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{upload.file.name}</span>
                <span className="text-muted-foreground">
                  {formatBytes(upload.file.size)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">
              Drop a file here or choose one from disk.
            </span>
          )}
          {upload.message ? (
            <p
              className={
                upload.status === "error"
                  ? "mt-2 text-destructive"
                  : "mt-2 text-muted-foreground"
              }
            >
              {upload.message}
            </p>
          ) : null}
        </div>
      </div>

      {selectedGame?.files.length ? (
        <div className="grid gap-2">
          {selectedGame.files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileArchive className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.sizeBytes)} · {file.mimeType} ·{" "}
                  {formatDate(file.createdAt)}
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                aria-label={`Delete ${file.filename}`}
                onClick={() => deleteFile(file.id)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No private downloads have been uploaded for this game yet.
        </p>
      )}
    </div>
  );
}
