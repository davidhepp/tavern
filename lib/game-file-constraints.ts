export const MAX_GAME_STORAGE_BYTES = 15 * 1024 * 1024 * 1024;
export const MAX_GAME_FILE_BYTES = 5 * 1024 * 1024 * 1024;
export const MULTIPART_PART_SIZE_BYTES = 100 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "application/octet-stream",
  "application/zip",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-tar",
  "application/gzip",
  "application/x-bzip2",
  "application/x-xz",
  "application/json",
  "text/plain",
]);

const allowedFileExtensions = new Set([
  ".7z",
  ".bz2",
  ".gz",
  ".json",
  ".rar",
  ".tar",
  ".txt",
  ".xz",
  ".zip",
]);

const splitSevenZipVolumePattern = /\.7z\.\d{3,}$/i;

function fileExtension(filename: string) {
  const dotIndex = filename.lastIndexOf(".");

  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : "";
}

export function sanitizeFilename(filename: string) {
  const normalized = filename
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const safe = normalized.replace(/(^\.+|\.+$)/g, "");
  return safe || "game-file.bin";
}

export function isAllowedGameFileMimeType(mimeType: string) {
  return allowedMimeTypes.has(mimeType.toLowerCase());
}

export function isAllowedGameFileExtension(filename: string) {
  return (
    allowedFileExtensions.has(fileExtension(filename)) ||
    splitSevenZipVolumePattern.test(filename)
  );
}

export function validateGameFileInput({
  filename,
  mimeType,
  sizeBytes,
}: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}) {
  if (!filename.trim()) return "A filename is required.";
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
    return "File size must be a positive integer.";
  }
  if (sizeBytes > MAX_GAME_FILE_BYTES) {
    return "Files must be 5GB or smaller.";
  }
  if (!isAllowedGameFileMimeType(mimeType) && !isAllowedGameFileExtension(filename)) {
    return "This file type is not allowed.";
  }

  return null;
}

export function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
