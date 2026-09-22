import crypto from "node:crypto";
import { logger } from "@audiwav/logger";
import {
  fileExists,
  generatePresignedUrl,
  generateTrackKey,
  uploadFile,
  type S3Client,
} from "@audiwav/storage";
import type { AudioProvider, AudioQuery, AudioResult } from "../core/types";
import { tagAudioBuffer } from "../tagger";

interface JioSaavnSongItem {
  id: string;
  song: string;
  album: string;
  primary_artists: string;
  duration?: string | number;
  encrypted_media_url?: string;
  "320kbps"?: string | boolean;
}

interface JioSaavnApiResponse {
  total: number;
  results: JioSaavnSongItem[];
}

export interface JioSaavnOptions {
  s3Client?: S3Client;
  s3BucketName?: string;
}

/**
 * Decrypts JioSaavn encrypted_media_url using native DES-ECB
 */
export function decryptJioSaavnMediaUrl(encryptedMediaUrl: string, quality: "high" | "normal" = "high"): string | null {
  try {
    const key = Buffer.from("38346591", "utf-8");
    const decipher = crypto.createDecipheriv("des-ecb", key, "");
    let decrypted = decipher.update(encryptedMediaUrl.trim(), "base64", "utf8");
    decrypted += decipher.final("utf8");

    if (!decrypted.startsWith("http")) {
      return null;
    }

    // Default decrypted link ends with _96.mp4
    if (quality === "high") {
      return decrypted.replace(/_[0-9]+\.mp4$/, "_320.mp4");
    } else {
      return decrypted.replace(/_[0-9]+\.mp4$/, "_160.mp4");
    }
  } catch (err) {
    logger.warn({ err }, "Failed to decrypt JioSaavn media URL");
    return null;
  }
}

/**
 * Memeriksa apakah artist dari JioSaavn cocok dengan artist yang diminta
 */
function isMatchingArtist(songArtist: string, queryArtist: string): boolean {
  const s = songArtist.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const q = queryArtist.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  if (!s || !q) return false;
  return s.includes(q) || q.includes(s);
}

/**
 * Memfilter apakah judul atau album mengandung indikasi remix, cover, karaoke, slowed, dll.
 * kecuali jika query pengguna memang memintanya secara eksplisit.
 */
function isUnwantedRemixOrCover(song: JioSaavnSongItem, queryTitle: string): boolean {
  const qLow = queryTitle.toLowerCase();
  const blacklist = [
    "remix",
    "karaoke",
    "instrumental",
    "cover",
    "slowed",
    "nightcore",
    "tribute",
    "eurodance",
    "dance mix",
    "lofi flip",
    "lofi",
    "re-recorded",
    "piano version",
    "ambient",
    "originally performed by",
    "originally perfomed by",
    "made famous by",
  ];

  const fullText = `${song.song} ${song.album} ${song.primary_artists}`.toLowerCase();

  for (const term of blacklist) {
    if (!qLow.includes(term) && fullText.includes(term)) {
      return true;
    }
  }

  return false;
}

/**
 * JioSaavn Provider: Mengambil direct MP4/AAC Stream (~160kbps/320kbps)
 * via native official internal endpoint jiosaavn.com.
 * Dilengkapi dengan filter verifikasi artis dan anti-remix/karaoke palsu.
 */
export class JioSaavnProvider implements AudioProvider {
  readonly name = "jiosaavn";

  private readonly s3Client?: S3Client;
  private readonly s3BucketName: string;

  constructor(options: JioSaavnOptions = {}) {
    this.s3Client = options.s3Client;
    this.s3BucketName = options.s3BucketName ?? "audiwav-tracks";
  }

  private generateS3Key(query: AudioQuery): string {
    const quality = query.quality === "normal" ? "normal" : "high";
    const id = query.recordingMbid || `${query.artist} - ${query.title}`;
    return generateTrackKey({ quality, id, format: "m4a" });
  }

  async find(query: AudioQuery): Promise<AudioResult | null> {
    try {
      // 0. Cek ketersediaan file di S3
      if (this.s3Client && query.recordingMbid) {
        const fileKey = this.generateS3Key(query);
        const exists = await fileExists(this.s3Client, { bucket: this.s3BucketName, key: fileKey });
        if (exists) {
          logger.info({ fileKey }, "JioSaavn track found in S3! Serving direct stream");
          return {
            provider: "local-s3",
            status: "ready",
            quality: query.quality ?? "high",
            format: "m4a",
            url: await generatePresignedUrl(this.s3Client, { bucket: this.s3BucketName, key: fileKey }),
          };
        }
      }

      const q = encodeURIComponent(`${query.title} ${query.artist}`);
      const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&n=15&p=1&_marker=0&ctx=web6dot0&q=${q}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) return null;

      const data = (await res.json()) as JioSaavnApiResponse;
      const songs = data?.results;

      if (!songs || songs.length === 0) {
        return null;
      }

      // Filter kandidat yang benar-benar cocok:
      // 1. Memiliki encrypted_media_url
      // 2. Artis cocok dengan query.artist (bukan artis cover seperti ZZang KARAOKE / LuxeBeats)
      // 3. Bukan remix / karaoke palsu (kecuali jika user memang mencari remix)
      const matchedSongs = songs.filter((s) => {
        if (!s.encrypted_media_url) return false;

        // Validasi kesesuaian artis
        if (!isMatchingArtist(s.primary_artists, query.artist)) {
          return false;
        }

        // Tolak remix / karaoke / cover tidak diinginkan
        if (isUnwantedRemixOrCover(s, query.title)) {
          return false;
        }

        // Validasi durasi jika query.duration tersedia (toleransi 25 detik)
        if (query.duration && s.duration) {
          const songDur = Number(s.duration);
          if (!Number.isNaN(songDur) && Math.abs(songDur - query.duration) > 25) {
            return false;
          }
        }

        return true;
      });

      const bestSong = matchedSongs[0];
      if (!bestSong || !bestSong.encrypted_media_url) {
        logger.warn(
          { title: query.title, artist: query.artist, totalResults: songs.length },
          "No genuine original track found on JioSaavn (filtered out covers/remixes)",
        );
        return null;
      }

      const targetQuality = query.quality === "normal" ? "normal" : "high";
      const directUrl = decryptJioSaavnMediaUrl(bestSong.encrypted_media_url, targetQuality);

      if (!directUrl) return null;

      return {
        provider: this.name,
        status: "ready",
        quality: targetQuality,
        format: "m4a",
        url: directUrl,
      };

    } catch (error) {
      logger.warn({ err: error, provider: this.name }, "JioSaavn fetch error/timeout");
      return null;
    }
  }

  /**
   * Mengunduh audio dari JioSaavn, menyuntikkan metadata enriched & cover, dan menyimpannya langsung ke S3
   */
  async download(query: AudioQuery): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const fileKey = this.generateS3Key(query);

      // 0. Cek S3 jika sudah ada
      if (this.s3Client) {
        const exists = await fileExists(this.s3Client, { bucket: this.s3BucketName, key: fileKey });
        if (exists) {
          logger.info({ fileKey }, "JioSaavn track already exists in S3. Download skipped.");
          const streamUrl = await generatePresignedUrl(this.s3Client, { bucket: this.s3BucketName, key: fileKey });
          return {
            success: true,
            message: "Track already exists in S3. Download skipped.",
            data: {
              alreadyDownloaded: true,
              s3Key: fileKey,
              streamUrl,
            },
          };
        }
      }

      // 1. Cari stream URL di JioSaavn (dengan validasi anti-remix)
      const streamResult = await this.find(query);
      if (!streamResult || !streamResult.url) {
        return {
          success: false,
          message: `Original track not found on JioSaavn (catalog only contains unofficial remixes or covers). Please use YouTube or Soulseek provider for this song.`,
        };
      }

      // 2. Fetch audio buffer langsung dari CDN JioSaavn
      logger.info({ title: query.title, artist: query.artist, url: streamResult.url }, "Downloading audio stream from JioSaavn CDN...");
      let audioRes = await fetch(streamResult.url);
      
      // Fallback jika 320kbps tidak tersedia di CDN untuk track tertentu, gunakan 160kbps
      if (!audioRes.ok && streamResult.url.endsWith("_320.mp4")) {
        const fallback160 = streamResult.url.replace("_320.mp4", "_160.mp4");
        logger.info("320kbps not found on CDN, falling back to 160kbps...");
        audioRes = await fetch(fallback160);
      }

      if (!audioRes.ok) {
        return { success: false, message: `Failed to download audio from CDN (${audioRes.status})` };
      }

      const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

      // 3. Suntikkan enriched metadata dan artwork ke audio buffer
      const finalBuffer = await tagAudioBuffer({
        audioBuffer,
        format: "m4a",
        tags: {
          title: query.title,
          artist: query.artist,
          album: query.album,
          releaseYear: query.releaseYear,
          releaseDate: query.releaseDate,
          genre: query.genre,
          trackNumber: query.trackNumber,
          trackCount: query.trackCount,
          discNumber: query.discNumber,
          discCount: query.discCount,
          recordingMbid: query.recordingMbid,
          artworkUrl: query.artworkUrl,
        },
      });

      // 4. Upload ke S3
      if (this.s3Client) {
        await uploadFile(this.s3Client, {
          bucket: this.s3BucketName,
          key: fileKey,
          body: finalBuffer,
          contentType: "audio/mp4",
        });

        logger.info({ fileKey, sizeMb: (finalBuffer.length / 1024 / 1024).toFixed(2) }, "Uploaded JioSaavn track to S3 successfully");

        const presignedUrl = await generatePresignedUrl(this.s3Client, { bucket: this.s3BucketName, key: fileKey });

        return {
          success: true,
          message: "Downloaded from JioSaavn, tagged with enriched metadata, and stored to S3 successfully",
          data: {
            s3Key: fileKey,
            sizeMb: (finalBuffer.length / 1024 / 1024).toFixed(2),
            quality: query.quality ?? "high",
            format: "m4a",
            streamUrl: presignedUrl,
          },
        };
      }

      return {
        success: true,
        message: "Audio stream resolved successfully",
        data: {
          url: streamResult.url,
          format: "m4a",
          quality: query.quality ?? "high",
        },
      };

    } catch (error) {
      logger.error({ err: error }, "JioSaavn download failed");
      return { success: false, message: `JioSaavn download error: ${String(error)}` };
    }
  }
}
