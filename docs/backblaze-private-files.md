# Private Game File Storage

This app stores private game files in a Backblaze B2 bucket through the S3-compatible API. The Next.js server never proxies file bytes. It authorizes a request, signs a short-lived URL, and the browser uploads or downloads directly with Backblaze.

## Required Environment

```sh
BACKBLAZE_B2_BUCKET_NAME=
BACKBLAZE_B2_ENDPOINT=
BACKBLAZE_B2_REGION=
BACKBLAZE_B2_KEY_ID=
BACKBLAZE_B2_APPLICATION_KEY=
ADMIN_API_TOKEN_HASHES=
```

`BACKBLAZE_B2_ENDPOINT` may be either the host name or a full HTTPS URL, for example `s3.eu-central-003.backblazeb2.com` or `https://s3.eu-central-003.backblazeb2.com`.

`ADMIN_API_TOKEN_HASHES` is a comma-separated list of SHA-256 token hashes. Store only hashes, not raw automation tokens.

Generate a token and hash:

```sh
openssl rand -hex 32
printf '%s' 'paste-token-here' | shasum -a 256
```

## Backblaze Setup

Create a private B2 bucket. Do not enable public file access.

Create an application key restricted to the bucket with permissions for listing files, reading files, writing files, and deleting files. Use its key ID and application key for the S3 credentials.

Configure CORS on the bucket for your production origin so browser uploads can use signed `PUT` part URLs. Expose the `ETag` response header because the completion endpoint needs each multipart part ETag.

Example CORS rule shape:

```json
[
  {
    "corsRuleName": "tavern-direct-uploads",
    "allowedOrigins": ["https://your-domain.example"],
    "allowedOperations": ["s3_put", "s3_post", "s3_head"],
    "allowedHeaders": ["*"],
    "exposeHeaders": ["ETag"],
    "maxAgeSeconds": 3600
  }
]
```

## Python Automation

The repository includes `scripts/tavern_archive_upload.py` for VPS-side upload automation. It accepts a local archive path, a direct downloadable URL, or a GoFile URL supported by `yt-dlp`, extracts it with 7-Zip, repacks it as a password-protected `.7z` archive with encrypted filenames, lets you select the target game through the admin API, then uploads the archive through the app's multipart upload endpoints.

Install runtime dependencies on the VPS:

```sh
sudo apt-get update
sudo apt-get install -y p7zip-full unrar python3-venv
python3 -m venv .venv
. .venv/bin/activate
pip install requests yt-dlp
```

Set the app URL and an admin API token:

```sh
export TAVERN_APP_URL="https://tavern.dasky.dev"
export TAVERN_ADMIN_TOKEN="paste-raw-admin-token-here"
```

Upload a local archive:

```sh
python scripts/tavern_archive_upload.py ./source.7z \
  --extract-password "source-archive-password" \
  --archive-password "tavern"
```

Upload from a direct downloadable URL:

```sh
python scripts/tavern_archive_upload.py "https://example.com/direct-file.7z" \
  --extract-password "source-archive-password" \
  --archive-password "tavern"
```

Upload from GoFile:

```sh
python scripts/tavern_archive_upload.py "https://gofile.io/d/example" \
  --extract-password "source-archive-password" \
  --archive-password "tavern"
```

GoFile downloads use `yt-dlp`. If a GoFile URL downloads multiple files, the script will process the single archive when exactly one archive file is present; otherwise, run it against a GoFile page containing only the archive you want to upload.
