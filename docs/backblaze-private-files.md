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

Automation can use the admin API to initialize multipart uploads, upload parts with `boto3`, then complete the upload through the app so metadata is saved only after Backblaze confirms the object.

```py
import math
import os
import pathlib
import requests
import boto3
from botocore.config import Config

APP_URL = os.environ["TAVERN_APP_URL"]
ADMIN_TOKEN = os.environ["TAVERN_ADMIN_TOKEN"]
GAME_ID = os.environ["TAVERN_GAME_ID"]
PATH = pathlib.Path("patch.zip")

headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
mime_type = "application/zip"

init = requests.post(
    f"{APP_URL}/api/admin/game-files/uploads/init",
    headers={**headers, "Content-Type": "application/json"},
    json={
        "gameId": GAME_ID,
        "filename": PATH.name,
        "mimeType": mime_type,
        "sizeBytes": PATH.stat().st_size,
    },
    timeout=30,
)
init.raise_for_status()
upload = init.json()

s3 = boto3.client(
    "s3",
    endpoint_url=os.environ["BACKBLAZE_B2_ENDPOINT"],
    region_name=os.environ["BACKBLAZE_B2_REGION"],
    aws_access_key_id=os.environ["BACKBLAZE_B2_KEY_ID"],
    aws_secret_access_key=os.environ["BACKBLAZE_B2_APPLICATION_KEY"],
    config=Config(signature_version="s3v4"),
)

parts = []
part_size = upload["partSizeBytes"]

with PATH.open("rb") as file:
    for part in upload["parts"]:
        file.seek((part["partNumber"] - 1) * part_size)
        body = file.read(part_size)
        response = requests.put(part["url"], data=body, timeout=300)
        response.raise_for_status()
        parts.append({
            "partNumber": part["partNumber"],
            "etag": response.headers["ETag"],
        })

complete = requests.post(
    f"{APP_URL}/api/admin/game-files/uploads/complete",
    headers={**headers, "Content-Type": "application/json"},
    json={
        "gameId": GAME_ID,
        "filename": upload["filename"],
        "mimeType": mime_type,
        "sizeBytes": PATH.stat().st_size,
        "storageKey": upload["storageKey"],
        "uploadId": upload["uploadId"],
        "parts": parts,
    },
    timeout=30,
)
complete.raise_for_status()
print(complete.json()["file"]["id"])
```
