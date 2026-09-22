import { S3Client } from "@aws-sdk/client-s3";

export interface StorageOptions {
  endpoint: string;    // e.g. http://localhost:9000
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;     // Usually 'us-east-1' for MinIO/RustFS
}

/**
 * Membuat instance dari AWS S3 Client.
 * Digunakan untuk terhubung ke MinIO, RustFS, atau Cloudflare R2.
 */
export function createStorageClient(options: StorageOptions): S3Client {
  return new S3Client({
    region: options.region ?? "us-east-1", // Harus di-set meskipun MinIO/RustFS tidak memakainya secada ketat (dumb region)
    endpoint: options.endpoint,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    // Wajib untuk s3 self-hosted (MinIO/RustFS) agar URL-nya berbentuk http://host/bucket/key 
    // bukan http://bucket.host/key (aturan AWS yang lama).
    forcePathStyle: true, 
  });
}

// Re-export S3Client so packages relying on storage package can use it without reinstalling aws-sdk
export { S3Client };
