import { S3Client } from "npm:@aws-sdk/client-s3@3";

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required B2 secret: ${name}`);
  return value;
}

export function b2Client(): S3Client {
  return new S3Client({
    region: Deno.env.get("B2_REGION") ?? "us-west-004",
    endpoint: required("B2_ENDPOINT"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: required("B2_KEY_ID"),
      secretAccessKey: required("B2_APPLICATION_KEY"),
    },
  });
}

export function b2Bucket(): string {
  return required("B2_BUCKET_NAME");
}

export function safeFilename(filename: string): string {
  return filename.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180) || "media";
}

export function mediaStorageKey(ownerId: string, assetId: string, filename: string): string {
  return `owners/${ownerId}/media/${assetId}/${safeFilename(filename)}`;
}

export function camelRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), value]),
  );
}

export const MEDIA_LIMIT_BYTES = 2_000_000_000;
export const UPLOAD_BLOCK_BYTES = 9_000_000_000;
export const MULTIPART_THRESHOLD_BYTES = 50 * 1024 * 1024;
export const MULTIPART_PART_BYTES = 16 * 1024 * 1024;

const mimeByKind = {
  image: new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif"]),
  audio: new Set(["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/aac", "audio/ogg", "audio/flac"]),
  video: new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"]),
} as const;

export function validateMediaMime(kind: keyof typeof mimeByKind, mimeType: string): void {
  if (!mimeByKind[kind].has(mimeType as never)) {
    throw new Error(`Unsupported ${kind} format: ${mimeType || "unknown"}.`);
  }
}
