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
import { formatDateTime } from "@/lib/format-date";
import {
  formatBytes,
  validateGameFileInput,
} from "@/lib/game-file-constraints";
import type { GameWithResources } from "@/lib/game-library";

type UploadQueueItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "complete" | "error";
  message: string;
};

type UploadInitResponse = {
  uploadId: string;
  storageKey: string;
  filename: string;
  partSizeBytes: number;
  parts?: { partNumber: number; url: string }[];
  partCount?: number;
};

class UploadPartError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "UploadPartError";
  }
}

const uploadPartMaxAttempts = 3;

function backblazeErrorMessage(status: number, responseText: string) {
  const parser = new DOMParser();
  const body = responseText.trim();

  if (!body) return `Part upload failed with status ${status}.`;

  const xml = parser.parseFromString(body, "application/xml");
  const code = xml.querySelector("Code")?.textContent?.trim();
  const message = xml.querySelector("Message")?.textContent?.trim();
  const requestId =
    xml.querySelector("RequestId")?.textContent?.trim() ||
    xml.querySelector("RequestID")?.textContent?.trim();

  if (code || message || requestId) {
    return [
      `Part upload failed with status ${status}`,
      code ? `code ${code}` : null,
      message ? `message: ${message}` : null,
      requestId ? `request id: ${requestId}` : null,
    ]
      .filter(Boolean)
      .join("; ");
  }

  return `Part upload failed with status ${status}: ${body.slice(0, 500)}`;
}

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
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const isUploading = uploadQueue.some((item) => item.status === "uploading");
  const selectedGame = useMemo(
    () => games.find((game) => game.id === gameId),
    [gameId, games],
  );

  function queueFiles(files: File[]) {
    if (!files.length) return;

    const items = files.map((file) => {
      const mimeType = file.type || "application/octet-stream";
      const error = validateGameFileInput({
        filename: file.name,
        mimeType,
        sizeBytes: file.size,
      });

      return {
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        progress: 0,
        status: error ? "error" : "queued",
        message: error ?? "Ready to upload.",
      } satisfies UploadQueueItem;
    });

    setUploadQueue(items);
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
          new UploadPartError(
            backblazeErrorMessage(xhr.status, responseText),
            xhr.status,
          ),
        );
      };
      xhr.onerror = () =>
        reject(
          new UploadPartError(
            "Part upload failed. Check the browser Network tab for a blocked Backblaze request; this is often caused by bucket CORS settings.",
          ),
        );
      xhr.send(blob);
    });
  }

  async function uploadPartWithRetry({
    init,
    targetGameId,
    partNumber,
    blob,
    onProgress,
    onRetry,
  }: {
    init: UploadInitResponse;
    targetGameId: string;
    partNumber: number;
    blob: Blob;
    onProgress: (loaded: number) => void;
    onRetry: (attempt: number) => void;
  }) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= uploadPartMaxAttempts; attempt += 1) {
      try {
        const url = await getUploadPartUrl({
          init,
          targetGameId,
          partNumber,
        });

        return await uploadPart(url, blob, onProgress);
      } catch (error) {
        lastError = error;

        if (attempt >= uploadPartMaxAttempts) break;

        onProgress(0);
        onRetry(attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Part upload failed.");
  }

  function updateQueueItem(
    itemId: string,
    update: Partial<Pick<UploadQueueItem, "progress" | "status" | "message">>,
  ) {
    setUploadQueue((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, ...update } : item,
      ),
    );
  }

  async function cancelUpload(init: UploadInitResponse, targetGameId: string) {
    await fetch("/api/admin/game-files/uploads/cancel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        gameId: targetGameId,
        storageKey: init.storageKey,
        uploadId: init.uploadId,
      }),
    });
  }

  async function getUploadPartUrl({
    init,
    targetGameId,
    partNumber,
  }: {
    init: UploadInitResponse;
    targetGameId: string;
    partNumber: number;
  }) {
    const response = await fetch("/api/admin/game-files/uploads/part-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        gameId: targetGameId,
        storageKey: init.storageKey,
        uploadId: init.uploadId,
        partNumber,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(body?.error ?? "Part upload URL generation failed.");
    }

    const body = (await response.json()) as { url?: string };

    if (!body.url) {
      throw new Error("Part upload URL generation failed.");
    }

    return body.url;
  }

  async function uploadFile(item: UploadQueueItem, targetGameId: string) {
    const file = item.file;
    const mimeType = file.type || "application/octet-stream";
    let init: UploadInitResponse | null = null;

    updateQueueItem(item.id, {
      progress: 0,
      status: "uploading",
      message: "Preparing upload...",
    });

    try {
      const initResponse = await fetch("/api/admin/game-files/uploads/init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gameId: targetGameId,
          filename: file.name,
          mimeType,
          sizeBytes: file.size,
          includePartUrls: false,
        }),
      });

      if (!initResponse.ok) {
        const body = (await initResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Upload initialization failed.");
      }

      const uploadInit = (await initResponse.json()) as UploadInitResponse;
      init = uploadInit;
      const uploadedByPart = new Map<number, number>();
      const completedParts = [];
      const partCount =
        uploadInit.partCount ?? uploadInit.parts?.length ?? 0;

      if (!partCount) {
        throw new Error("Upload initialization did not return any parts.");
      }

      for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
        const start = (partNumber - 1) * uploadInit.partSizeBytes;
        const end = Math.min(start + uploadInit.partSizeBytes, file.size);
        const blob = file.slice(start, end);
        const etag = await uploadPartWithRetry({
          init: uploadInit,
          targetGameId,
          partNumber,
          blob,
          onProgress: (loaded) => {
            uploadedByPart.set(partNumber, loaded);
            const totalLoaded = Array.from(uploadedByPart.values()).reduce(
              (total, value) => total + value,
              0,
            );

            updateQueueItem(item.id, {
              progress: Math.min(99, Math.round((totalLoaded / file.size) * 100)),
              message: `Uploading part ${partNumber} of ${partCount}...`,
            });
          },
          onRetry: (attempt) => {
            updateQueueItem(item.id, {
              message: `Retrying part ${partNumber} of ${partCount} (${attempt}/${uploadPartMaxAttempts})...`,
            });
          },
        });

        uploadedByPart.set(partNumber, blob.size);
        completedParts.push({ partNumber, etag });
      }

      const completeResponse = await fetch(
        "/api/admin/game-files/uploads/complete",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            gameId: targetGameId,
            filename: uploadInit.filename,
            mimeType,
            sizeBytes: file.size,
            storageKey: uploadInit.storageKey,
            uploadId: uploadInit.uploadId,
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

      init = null;
      updateQueueItem(item.id, {
        progress: 100,
        status: "complete",
        message: "Upload complete.",
      });
      return true;
    } catch (error) {
      if (init) {
        await cancelUpload(init, targetGameId).catch(() => null);
      }

      updateQueueItem(item.id, {
        status: "error",
        message: error instanceof Error ? error.message : "Upload failed.",
      });
      return false;
    }
  }

  async function startUploads() {
    if (!gameId || isUploading) return;

    const targetGameId = gameId;
    const filesToUpload = uploadQueue.filter((item) => item.status === "queued");

    let uploadedCount = 0;

    for (const item of filesToUpload) {
      if (await uploadFile(item, targetGameId)) {
        uploadedCount += 1;
      }
    }

    if (uploadedCount > 0) {
      toast.success(
        uploadedCount === 1 ? "File uploaded." : `${uploadedCount} files uploaded.`,
      );
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
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
          queueFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Game</Label>
              <Select
                value={gameId}
                onValueChange={setGameId}
                disabled={isUploading}
              >
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
              <Label>Files</Label>
              <Input
                ref={inputRef}
                type="file"
                multiple
                onChange={(event) =>
                  queueFiles(Array.from(event.currentTarget.files ?? []))
                }
              />
            </div>
          </div>
          <Button
            type="button"
            disabled={
              !uploadQueue.some((item) => item.status === "queued") ||
              !gameId ||
              isUploading
            }
            onClick={startUploads}
          >
            <UploadCloud />
            Upload
          </Button>
        </div>

        <div className="mt-3 min-h-10 rounded-md bg-background p-3 text-sm">
          {uploadQueue.length ? (
            <div className="space-y-3">
              {uploadQueue.map((item) => (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">
                      {item.file.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatBytes(item.file.size)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={
                        item.status === "error"
                          ? "h-full bg-destructive transition-all"
                          : "h-full bg-primary transition-all"
                      }
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <p
                    className={
                      item.status === "error"
                        ? "text-xs text-destructive"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {item.message}
                  </p>
                </div>
              ))}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => {
                    setUploadQueue([]);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">
              Drop files here or choose them from disk.
            </span>
          )}
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
                  {formatDateTime(file.createdAt)}
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
