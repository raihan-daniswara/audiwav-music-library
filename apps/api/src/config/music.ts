import { createDefaultAudioFinder, type AudioFinder } from "@audiwav/music";
import { createStorageClient } from "@audiwav/storage";
import { env } from "./env";

let audioFinder: AudioFinder | undefined;

/**
 * Membuat AudioFinder (dengan urutan fallback Slskd -> JioSaavn -> YouTube) secara lazy.
 * Otomatis di-inject dengan koneksi ke Local S3 Storage (RustFS).
 */
export function getAudioFinder(): AudioFinder {
  if (!audioFinder) {
    const s3Client = createStorageClient({
      endpoint: "http://localhost:9000",
      accessKeyId: env.RUSTFS_ACCESS_KEY,
      secretAccessKey: env.RUSTFS_SECRET_KEY,
    });

    audioFinder = createDefaultAudioFinder({
      slskdOptions: {
        s3Client: s3Client,
        s3BucketName: "audiwav-tracks",      
        apiKey: env.SLSKD_API_KEY
      }
    });
  }

  return audioFinder;
}
