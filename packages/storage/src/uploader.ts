import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";

export interface UploadOptions {
  bucket: string;
  key: string;
  body: Uint8Array | Buffer | ReadableStream | Blob;
  contentType?: string;
}

/**
 * Mengunggah file / buffer langsung ke S3 Bucket.
 */
export async function uploadFile(
  client: S3Client,
  options: UploadOptions,
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: options.bucket,
    Key: options.key,
    Body: options.body,
    ContentType: options.contentType,
  });

  await client.send(command);
}

/**
 * Membersihkan karakter ilegal untuk path file di S3 / OS filesystem
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

export interface GenerateTrackKeyParams {
  quality?: "lossless" | "high" | "normal" | string;
  format?: string;
  id: string;
  artist?: string;
  title?: string;
}

/**
 * Helper pembuat S3 key terstandarisasi berdasarkan Quality & MBID:
 * Format: {quality}/{id}.{format}
 * Contoh:
 *   "lossless/chiquitita-mbid-9999.flac"
 *   "high/shape-of-you-mbid.m4a"
 *   "normal/bohemian-rhapsody-mbid.m4a"
 */
export function generateTrackKey(
  qualityOrParams: string | GenerateTrackKeyParams,
  idFallback?: string,
  formatFallback?: string,
): string {
  if (typeof qualityOrParams === "object") {
    const quality = (qualityOrParams.quality ?? "lossless").toLowerCase();
    const defaultFormat = quality === "lossless" ? "flac" : "m4a";
    const format = (qualityOrParams.format ?? defaultFormat).toLowerCase().replace(/^\./, "");
    const id = qualityOrParams.id;
    return `${quality}/${id}.${format}`;
  }

  // Jika dipanggil via argumen string terpisah:
  // e.g. generateTrackKey("lossless", "uuid-123", "flac")
  const quality = qualityOrParams.toLowerCase();
  const id = idFallback ?? "unknown";
  const defaultFormat = quality === "lossless" ? "flac" : (quality === "flac" ? "flac" : "m4a");
  const format = (formatFallback ?? defaultFormat).toLowerCase().replace(/^\./, "");

  // Jika pengguna memanggil legacy format: generateTrackKey("flac", id) -> konversi ke lossless
  if (quality === "flac") {
    return `lossless/${id}.flac`;
  }

  return `${quality}/${id}.${format}`;
}
