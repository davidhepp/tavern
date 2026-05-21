#!/usr/bin/env python3
"""
Download or read an archive, extract it with 7-Zip, repack it as an encrypted
7z archive, then upload it to Tavern through the admin upload API.

This script accepts local paths, direct downloadable URLs, and GoFile pages
downloadable by yt-dlp.
"""

from __future__ import annotations

import argparse
import hashlib
import mimetypes
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from typing import Any
from urllib.parse import unquote, urlparse

try:
    import requests
except ModuleNotFoundError:
    requests = None  # type: ignore[assignment]


DEFAULT_REPACK_PASSWORD = "tavern"
DEFAULT_REPACK_COMPRESSION_LEVEL = 3
DEFAULT_REPACK_DICTIONARY = "64m"
DEFAULT_REPACK_FAST_BYTES = 32
REPACK_DICTIONARY_FALLBACKS = (
    "64m",
    "32m",
    "16m",
    "8m",
)
SEVEN_ZIP_MEMORY_ERROR_EXIT_CODE = 8
DIRECT_DOWNLOAD_EXTENSIONS = {
    ".7z",
    ".bz2",
    ".gz",
    ".rar",
    ".tar",
    ".xz",
    ".zip",
}
YTDLP_TRANSIENT_EXTENSIONS = {
    ".part",
    ".temp",
    ".tmp",
    ".ytdl",
}


@dataclass
class Game:
    id: str
    title: str
    platform: str | None
    status: str


class CommandError(RuntimeError):
    def __init__(self, command_name: str, returncode: int):
        self.command_name = command_name
        self.returncode = returncode
        super().__init__(f"{command_name} failed with exit code {returncode}.")


def env_or_arg(value: str | None, name: str) -> str:
    if value:
        return value.rstrip("/") if name.endswith("URL") else value

    env_value = os.environ.get(name)
    if env_value:
        return env_value.rstrip("/") if name.endswith("URL") else env_value

    raise SystemExit(f"Missing required value. Pass it or set {name}.")


def request_json(response: requests.Response) -> Any:
    try:
        body = response.json()
    except ValueError:
        response.raise_for_status()
        raise

    if not response.ok:
        message = body.get("error") if isinstance(body, dict) else None
        raise RuntimeError(message or f"Request failed with status {response.status_code}.")

    return body


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def fetch_games(app_url: str, token: str) -> list[Game]:
    response = requests.get(
        f"{app_url}/api/admin/games",
        headers=auth_headers(token),
        timeout=30,
    )
    body = request_json(response)

    return [
        Game(
            id=item["id"],
            title=item["title"],
            platform=item.get("platform"),
            status=item["status"],
        )
        for item in body["games"]
    ]


def choose_game(games: list[Game]) -> Game:
    if not games:
        raise SystemExit("No games are available in Tavern.")

    for index, game in enumerate(games, start=1):
        platform = f" · {game.platform}" if game.platform else ""
        status = "" if game.status == "active" else f" · {game.status}"
        print(f"{index:>2}. {game.title}{platform}{status}")

    while True:
        selection = input("Select game number: ").strip()
        if selection.isdigit():
            index = int(selection)
            if 1 <= index <= len(games):
                return games[index - 1]

        print("Enter one of the listed numbers.")


def find_7z() -> str:
    for command in ("7zz", "7z"):
        path = shutil.which(command)
        if path:
            return path

    raise SystemExit("7-Zip was not found. Install 7z/7zz before running this script.")


def find_yt_dlp() -> str:
    path = shutil.which("yt-dlp")
    if path:
        return path

    raise SystemExit("yt-dlp was not found. Install it before downloading GoFile URLs.")


def find_unrar() -> str | None:
    return shutil.which("unrar")


def is_gofile_page_url(url: str) -> bool:
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    return (
        parsed.scheme in {"http", "https"}
        and host in {"gofile.io", "www.gofile.io"}
        and (parsed.path.startswith("/d/") or parsed.query.startswith("c="))
    )


def safe_filename(value: str) -> str:
    value = unquote(value)
    value = re.sub(r"[^\w.\- ]+", "", value, flags=re.ASCII).strip()
    value = re.sub(r"\s+", " ", value)
    value = value.strip(".")
    return value or "downloaded-archive"


def tavern_filename(value: str) -> str:
    return re.sub("ofme", "TAVERN", value, flags=re.I)


def filename_from_content_disposition(value: str | None) -> str | None:
    if not value:
        return None

    match = re.search(r"filename\*=UTF-8''([^;]+)", value, flags=re.I)
    if match:
        return safe_filename(match.group(1).strip().strip('"'))

    match = re.search(r'filename="?([^";]+)"?', value, flags=re.I)
    if match:
        return safe_filename(match.group(1).strip())

    return None


def looks_like_direct_download(url: str, response: requests.Response) -> bool:
    parsed = urlparse(url)
    path_extension = pathlib.PurePosixPath(parsed.path).suffix.lower()
    content_disposition = response.headers.get("content-disposition")
    content_type = response.headers.get("content-type", "").split(";")[0].lower()

    if parsed.netloc.lower().endswith("gofile.io") and parsed.path.startswith("/d/"):
        return False

    if content_disposition:
        return True

    if path_extension in DIRECT_DOWNLOAD_EXTENSIONS:
        return True

    return content_type in {
        "application/octet-stream",
        "application/x-7z-compressed",
        "application/zip",
        "application/x-rar-compressed",
        "application/vnd.rar",
    }


def download_source(url: str, destination_dir: pathlib.Path) -> pathlib.Path:
    with requests.get(url, stream=True, timeout=30, allow_redirects=True) as response:
        if not looks_like_direct_download(url, response):
            raise SystemExit(
                "The provided URL does not look like a direct file download. "
                "Use a direct URL or download the file locally first."
            )

        response.raise_for_status()
        filename = filename_from_content_disposition(
            response.headers.get("content-disposition"),
        )
        if not filename:
            filename = safe_filename(pathlib.PurePosixPath(urlparse(response.url).path).name)

        path = destination_dir / filename
        with path.open("wb") as file:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    file.write(chunk)

    return path


def is_transient_download_file(path: pathlib.Path) -> bool:
    return any(
        suffix.lower() in YTDLP_TRANSIENT_EXTENSIONS
        for suffix in path.suffixes
    )


def downloaded_files(path: pathlib.Path) -> list[pathlib.Path]:
    return sorted(
        item
        for item in path.rglob("*")
        if item.is_file() and not is_transient_download_file(item)
    )


def download_gofile_source(url: str, destination_dir: pathlib.Path) -> pathlib.Path:
    yt_dlp = find_yt_dlp()
    gofile_dir = destination_dir / "gofile"
    gofile_dir.mkdir()

    command = [
        yt_dlp,
        "--paths",
        str(gofile_dir),
        "--output",
        "%(title).200B.%(ext)s",
        url,
    ]
    process = subprocess.run(command, check=False)
    if process.returncode != 0:
        raise RuntimeError(f"yt-dlp failed with exit code {process.returncode}.")

    files = downloaded_files(gofile_dir)
    if len(files) == 1:
        return files[0]

    if not files:
        raise SystemExit("yt-dlp did not download any files from the GoFile URL.")

    archive_files = [
        path
        for path in files
        if pathlib.PurePosixPath(path.name).suffix.lower() in DIRECT_DOWNLOAD_EXTENSIONS
    ]
    if len(archive_files) == 1:
        return archive_files[0]

    relative_files = "\n".join(f"  - {path.relative_to(gofile_dir)}" for path in files)
    raise SystemExit(
        "The GoFile URL downloaded multiple files, but this script can process one "
        f"archive at a time:\n{relative_files}"
    )


def prepare_source(source: str, work_dir: pathlib.Path) -> pathlib.Path:
    parsed = urlparse(source)
    if parsed.scheme in {"http", "https"}:
        if is_gofile_page_url(source):
            print("Downloading GoFile source with yt-dlp...")
            return download_gofile_source(source, work_dir)

        print("Downloading source...")
        return download_source(source, work_dir)

    path = pathlib.Path(source).expanduser().resolve()
    if not path.is_file():
        raise SystemExit(f"Source file does not exist: {path}")

    target = work_dir / path.name
    shutil.copy2(path, target)
    return target


def run_7z(command: list[str]) -> None:
    process = subprocess.run(command, check=False)
    if process.returncode != 0:
        raise CommandError("7-Zip", process.returncode)


def run_unrar(command: list[str]) -> None:
    process = subprocess.run(command, check=False)
    if process.returncode != 0:
        raise CommandError("unrar", process.returncode)


def extract_archive(
  seven_zip: str,
  archive: pathlib.Path,
  output_dir: pathlib.Path,
  password: str | None,
) -> None:
    command = [seven_zip, "x", "-y", f"-o{output_dir}", str(archive)]
    if password:
        command.insert(3, f"-p{password}")

    try:
        run_7z(command)
        return
    except RuntimeError:
        if archive.suffix.lower() != ".rar":
            raise

    unrar = find_unrar()
    if not unrar:
        raise SystemExit(
            "7-Zip could not extract this RAR archive, and unrar was not found. "
            "Install unrar and run the script again."
        )

    print("7-Zip could not extract this RAR archive. Retrying with unrar...")
    shutil.rmtree(output_dir, ignore_errors=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    unrar_command = [
        unrar,
        "x",
        "-y",
        "-o+",
        f"-p{password}" if password else "-p-",
        str(archive),
        f"{output_dir}{os.sep}",
    ]
    run_unrar(unrar_command)


def repack_archive(
    seven_zip: str,
    source_dir: pathlib.Path,
    output_path: pathlib.Path,
    password: str,
    dictionary: str,
    compression_level: int,
    fast_bytes: int,
) -> None:
    if output_path.exists():
        output_path.unlink()

    command = [
        seven_zip,
        "a",
        "-t7z",
        f"-mx={compression_level}",
        "-m0=lzma2",
        f"-md={dictionary}",
        f"-mfb={fast_bytes}",
        "-ms=off",
        "-mhe=on",
        f"-p{password}",
        str(output_path),
        str(source_dir / "."),
    ]
    run_7z(command)


def dictionary_size_bytes(value: str) -> int | None:
    match = re.fullmatch(r"(\d+)([bkmgt]?)", value.strip(), flags=re.I)
    if not match:
        return None

    amount = int(match.group(1))
    unit = match.group(2).lower()
    multipliers = {
        "": 1,
        "b": 1,
        "k": 1024,
        "m": 1024**2,
        "g": 1024**3,
        "t": 1024**4,
    }
    return amount * multipliers[unit]


def repack_dictionary_attempts(dictionary: str) -> list[str]:
    attempts = [dictionary]
    requested_size = dictionary_size_bytes(dictionary)

    for fallback in REPACK_DICTIONARY_FALLBACKS:
        if fallback == dictionary:
            continue

        fallback_size = dictionary_size_bytes(fallback)
        if requested_size is not None and fallback_size is not None:
            if fallback_size >= requested_size:
                continue

        attempts.append(fallback)

    return attempts


def repack_archive_with_fallbacks(
    seven_zip: str,
    source_dir: pathlib.Path,
    output_path: pathlib.Path,
    password: str,
    dictionary: str,
    compression_level: int,
    fast_bytes: int,
) -> str:
    attempts = repack_dictionary_attempts(dictionary)

    for index, attempt in enumerate(attempts):
        if index:
            print(f"Retrying repack with smaller dictionary: {attempt}...")
        else:
            print(f"Using 7z dictionary: {attempt}")

        try:
            repack_archive(
                seven_zip,
                source_dir,
                output_path,
                password,
                attempt,
                compression_level,
                fast_bytes,
            )
            return attempt
        except CommandError as error:
            if error.returncode != SEVEN_ZIP_MEMORY_ERROR_EXIT_CODE:
                raise

            if index == len(attempts) - 1:
                raise SystemExit(
                    "7-Zip could not allocate enough memory even with the smallest "
                    f"dictionary fallback ({attempt}). Retry with --dictionary 4m "
                    "or use a VPS with more RAM."
                ) from error

            if output_path.exists():
                output_path.unlink()
            print(f"7-Zip ran out of memory with dictionary {attempt}.")

    raise RuntimeError("Repack failed before any dictionary attempt completed.")


def sha256_file(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def init_upload(app_url: str, token: str, game_id: str, path: pathlib.Path) -> dict[str, Any]:
    mime_type = mimetypes.guess_type(path.name)[0] or "application/x-7z-compressed"
    response = requests.post(
        f"{app_url}/api/admin/game-files/uploads/init",
        headers={**auth_headers(token), "Content-Type": "application/json"},
        json={
            "gameId": game_id,
            "filename": path.name,
            "mimeType": mime_type,
            "sizeBytes": path.stat().st_size,
            "checksum": sha256_file(path),
        },
        timeout=30,
    )
    return request_json(response)


def cancel_upload(app_url: str, token: str, game_id: str, upload: dict[str, Any]) -> None:
    requests.post(
        f"{app_url}/api/admin/game-files/uploads/cancel",
        headers={**auth_headers(token), "Content-Type": "application/json"},
        json={
            "gameId": game_id,
            "storageKey": upload["storageKey"],
            "uploadId": upload["uploadId"],
        },
        timeout=30,
    )


def upload_parts(path: pathlib.Path, upload: dict[str, Any]) -> list[dict[str, Any]]:
    parts = []
    part_size = upload["partSizeBytes"]

    with path.open("rb") as file:
        for part in upload["parts"]:
            file.seek((part["partNumber"] - 1) * part_size)
            body = file.read(part_size)
            print(f"Uploading part {part['partNumber']} of {len(upload['parts'])}...")
            response = requests.put(part["url"], data=body, timeout=600)
            response.raise_for_status()
            etag = response.headers.get("ETag")
            if not etag:
                raise RuntimeError("Backblaze did not return an ETag for an uploaded part.")
            parts.append({"partNumber": part["partNumber"], "etag": etag})

    return parts


def complete_upload(
    app_url: str,
    token: str,
    game_id: str,
    path: pathlib.Path,
    upload: dict[str, Any],
    parts: list[dict[str, Any]],
) -> dict[str, Any]:
    mime_type = mimetypes.guess_type(path.name)[0] or "application/x-7z-compressed"
    response = requests.post(
        f"{app_url}/api/admin/game-files/uploads/complete",
        headers={**auth_headers(token), "Content-Type": "application/json"},
        json={
            "gameId": game_id,
            "filename": upload["filename"],
            "mimeType": mime_type,
            "sizeBytes": path.stat().st_size,
            "checksum": sha256_file(path),
            "storageKey": upload["storageKey"],
            "uploadId": upload["uploadId"],
            "parts": parts,
        },
        timeout=60,
    )
    return request_json(response)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Repack a local/direct-download archive and upload it to Tavern.",
    )
    parser.add_argument("source", help="Local archive path or direct downloadable URL.")
    parser.add_argument("--app-url", help="Tavern app URL. Defaults to TAVERN_APP_URL.")
    parser.add_argument("--token", help="Admin API token. Defaults to TAVERN_ADMIN_TOKEN.")
    parser.add_argument("--extract-password", help="Password for the source archive.")
    parser.add_argument(
        "--archive-password",
        default=DEFAULT_REPACK_PASSWORD,
        help="Password for the repacked archive. Defaults to tavern.",
    )
    parser.add_argument("--output-name", help="Repacked archive filename.")
    parser.add_argument(
        "--dictionary",
        default=DEFAULT_REPACK_DICTIONARY,
        help=(
            "Initial 7z dictionary size for compression. Defaults to 64m for weaker "
            "machines. The script retries with smaller dictionaries if 7-Zip runs "
            "out of memory."
        ),
    )
    parser.add_argument(
        "--compression-level",
        type=int,
        choices=range(0, 10),
        default=DEFAULT_REPACK_COMPRESSION_LEVEL,
        metavar="0-9",
        help="7z compression level. Defaults to 3 to keep CPU and memory usage modest.",
    )
    parser.add_argument(
        "--fast-bytes",
        type=int,
        default=DEFAULT_REPACK_FAST_BYTES,
        help="7z LZMA2 fast-bytes value. Defaults to 32 for faster, lighter repacking.",
    )
    parser.add_argument("--work-dir", help="Directory for temporary extraction/repacking.")
    parser.add_argument("--keep-work", action="store_true", help="Do not delete work files.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if requests is None:
        raise SystemExit("Missing Python dependency: requests. Install it with: pip install requests")

    app_url = env_or_arg(args.app_url, "TAVERN_APP_URL")
    token = env_or_arg(args.token, "TAVERN_ADMIN_TOKEN")
    seven_zip = find_7z()

    root = pathlib.Path(args.work_dir).expanduser().resolve() if args.work_dir else None
    work_dir = pathlib.Path(tempfile.mkdtemp(prefix="tavern-upload-", dir=root))

    try:
        source_path = prepare_source(args.source, work_dir)
        extract_dir = work_dir / "extracted"
        extract_dir.mkdir()

        print("Extracting archive...")
        extract_archive(seven_zip, source_path, extract_dir, args.extract_password)

        output_name = args.output_name or f"{source_path.stem}.7z"
        if not output_name.lower().endswith(".7z"):
            output_name = f"{output_name}.7z"
        output_path = work_dir / safe_filename(tavern_filename(output_name))

        print("Repacking archive...")
        used_dictionary = repack_archive_with_fallbacks(
            seven_zip,
            extract_dir,
            output_path,
            args.archive_password,
            args.dictionary,
            args.compression_level,
            args.fast_bytes,
        )

        print(
            f"Created {output_path.name} ({output_path.stat().st_size} bytes) "
            f"with dictionary {used_dictionary}."
        )
        games = fetch_games(app_url, token)
        game = choose_game(games)
        print(f"Selected: {game.title}")

        upload = init_upload(app_url, token, game.id, output_path)
        try:
            parts = upload_parts(output_path, upload)
            completed = complete_upload(app_url, token, game.id, output_path, upload, parts)
        except Exception:
            cancel_upload(app_url, token, game.id, upload)
            raise

        print(f"Uploaded file id: {completed['file']['id']}")
        return 0
    finally:
        if args.keep_work:
            print(f"Work directory kept at: {work_dir}")
        else:
            shutil.rmtree(work_dir, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
