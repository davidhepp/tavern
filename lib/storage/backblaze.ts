import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectVersionsCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const downloadUrlTtlSeconds = 60;
export const uploadUrlTtlSeconds = 6 * 60 * 60;

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function endpointUrl() {
  const endpoint = requiredEnv("BACKBLAZE_B2_ENDPOINT").trim();

  if (!endpoint) {
    throw new Error("Missing required environment variable: BACKBLAZE_B2_ENDPOINT");
  }

  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  return `https://${endpoint}`;
}

function bucketName() {
  return requiredEnv("BACKBLAZE_B2_BUCKET_NAME");
}

export function backblazeClient() {
  return new S3Client({
    endpoint: endpointUrl(),
    region: requiredEnv("BACKBLAZE_B2_REGION"),
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: requiredEnv("BACKBLAZE_B2_KEY_ID"),
      secretAccessKey: requiredEnv("BACKBLAZE_B2_APPLICATION_KEY"),
    },
  });
}

export async function createMultipartUpload({
  key,
  filename,
  mimeType,
  checksum,
}: {
  key: string;
  filename: string;
  mimeType: string;
  checksum?: string | null;
}) {
  const command = new CreateMultipartUploadCommand({
    Bucket: bucketName(),
    Key: key,
    ContentType: mimeType,
    Metadata: {
      filename,
      ...(checksum ? { checksum } : {}),
    },
  });

  const response = await backblazeClient().send(command);

  if (!response.UploadId) {
    throw new Error("Backblaze did not return a multipart upload id.");
  }

  return response.UploadId;
}

export async function signedUploadPartUrl({
  key,
  uploadId,
  partNumber,
}: {
  key: string;
  uploadId: string;
  partNumber: number;
}) {
  const command = new UploadPartCommand({
    Bucket: bucketName(),
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return getSignedUrl(backblazeClient(), command, {
    expiresIn: uploadUrlTtlSeconds,
  });
}

export async function completeMultipartUpload({
  key,
  uploadId,
  parts,
}: {
  key: string;
  uploadId: string;
  parts: { partNumber: number; etag: string }[];
}) {
  const command = new CompleteMultipartUploadCommand({
    Bucket: bucketName(),
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts
        .sort((left, right) => left.partNumber - right.partNumber)
        .map((part) => ({
          PartNumber: part.partNumber,
          ETag: part.etag,
        })),
    },
  });

  await backblazeClient().send(command);
}

export async function abortMultipartUpload({
  key,
  uploadId,
}: {
  key: string;
  uploadId: string;
}) {
  await backblazeClient().send(
    new AbortMultipartUploadCommand({
      Bucket: bucketName(),
      Key: key,
      UploadId: uploadId,
    }),
  );
}

export async function headGameFileObject(key: string) {
  return backblazeClient().send(
    new HeadObjectCommand({
      Bucket: bucketName(),
      Key: key,
    }),
  );
}

function downloadContentDisposition(filename: string) {
  const fallbackFilename = filename.replace(/[^\x20-\x7e]+/g, "_");
  const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, (match) =>
    `%${match.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${fallbackFilename.replace(/["\\]/g, "_")}"; filename*=UTF-8''${encodedFilename}`;
}

export async function signedDownloadUrl({
  key,
  filename,
}: {
  key: string;
  filename: string;
}) {
  const command = new GetObjectCommand({
    Bucket: bucketName(),
    Key: key,
    ResponseContentDisposition: downloadContentDisposition(filename),
  });

  return getSignedUrl(backblazeClient(), command, {
    expiresIn: downloadUrlTtlSeconds,
  });
}

export async function deleteGameFileObject(key: string) {
  const client = backblazeClient();
  const bucket = bucketName();
  const objects = [];
  let keyMarker: string | undefined;
  let versionIdMarker: string | undefined;

  do {
    const versions = await client.send(
      new ListObjectVersionsCommand({
        Bucket: bucket,
        Prefix: key,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
      }),
    );

    objects.push(
      ...[...(versions.Versions ?? []), ...(versions.DeleteMarkers ?? [])]
        .filter((version) => version.Key === key && version.VersionId)
        .map((version) => ({
          Key: key,
          VersionId: version.VersionId,
        })),
    );

    keyMarker = versions.NextKeyMarker;
    versionIdMarker = versions.NextVersionIdMarker;
  } while (keyMarker);

  if (!objects.length) {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    return;
  }

  await client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: objects,
      },
    }),
  );
}

export async function hideGameFileObject(key: string) {
  await backblazeClient().send(
    new DeleteObjectCommand({
      Bucket: bucketName(),
      Key: key,
    }),
  );
}
