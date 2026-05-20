import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const downloadUrlTtlSeconds = 60;
const uploadUrlTtlSeconds = 15 * 60;

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

export async function headGameFileObject(key: string) {
  return backblazeClient().send(
    new HeadObjectCommand({
      Bucket: bucketName(),
      Key: key,
    }),
  );
}

export async function signedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: bucketName(),
    Key: key,
  });

  return getSignedUrl(backblazeClient(), command, {
    expiresIn: downloadUrlTtlSeconds,
  });
}

export async function deleteGameFileObject(key: string) {
  await backblazeClient().send(
    new DeleteObjectCommand({
      Bucket: bucketName(),
      Key: key,
    }),
  );
}
