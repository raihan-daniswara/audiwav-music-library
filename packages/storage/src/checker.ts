import { HeadObjectCommand, ListObjectsV2Command, type S3Client } from "@aws-sdk/client-s3";

export interface FileCheckOptions {
  bucket: string;
  key: string;
}

/**
 * Mengekstrak informasi dari file S3, atau melihat apakah file itu exist/ada di S3 storage.
 */
export async function fileExists(
  client: S3Client,
  options: FileCheckOptions,
): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: options.bucket,
      Key: options.key,
    });
    
    // Jika tidak melempar/menabrak error, berarti file tersedia!
    await client.send(command);
    
    return true;
  } catch (error: any) {
    // Error 'NotFound' (HTTP 404) berarti file belum ada di storage
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    
    // Jika error lainnya (seperti salah credentials atau network failure), lempar error:
    throw error;
  }
}

/**
 * Mencari key objek pertama di dalam prefix/folder S3 tertentu.
 * Sangat berguna ketika mencari file di dalam prefix: `flac/{recording_mbid}/`
 */
export async function findFirstObjectKeyByPrefix(
  client: S3Client,
  options: { bucket: string; prefix: string },
): Promise<string | null> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: options.bucket,
      Prefix: options.prefix,
      MaxKeys: 1,
    });

    const res = await client.send(command);
    if (res.Contents && res.Contents.length > 0 && res.Contents[0]?.Key) {
      return res.Contents[0].Key;
    }
    return null;
  } catch {
    return null;
  }
}
