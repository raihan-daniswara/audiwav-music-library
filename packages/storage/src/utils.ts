import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, type S3Client } from "@aws-sdk/client-s3";

export interface PresignedUrlOptions {
  bucket: string;
  key: string;
  /** Expires in seconds, default to 1 day (86400) */
  expiresIn?: number;
}

/**
 * Menghasilkan Presigned URL Stream.
 * Frontend bisa memakai link URL ini langsung diletakkan di tag <audio src="..."> html.
 */
export async function generatePresignedUrl(
  client: S3Client,
  options: PresignedUrlOptions,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: options.bucket,
    Key: options.key,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: options.expiresIn ?? 86400,
  });

  return url;
}
