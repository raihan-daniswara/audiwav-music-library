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

export interface YouTubeOptions {
  baseUrl?: string;
  s3Client?: S3Client;
  s3BucketName?: string;
}

/**
 * YouTube Provider: Menggunakan yt-dlp native (atau Piped API fallback)
 * untuk mengambil audio AAC/Opus publik YouTube (~128kbps / kualitas 'normal').
 */
export class YouTubeProvider implements AudioProvider {
  readonly name = "youtube";

  private readonly baseUrl: string;
  private readonly s3Client?: S3Client;
  private readonly s3BucketName: string;

  constructor(options: YouTubeOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://api.piped.private.coffee";
    this.s3Client = options.s3Client;
    this.s3BucketName = options.s3BucketName ?? "audiwav-tracks";
  }

  private generateS3Key(query: AudioQuery, format = "m4a"): string {
    const quality = "normal";
    const id = query.recordingMbid || `${query.artist} - ${query.title}`;
    return generateTrackKey({ quality, id, format });
  }

  /**
   * Menemukan URL stream audio YouTube
   */
  async find(query: AudioQuery): Promise<AudioResult | null> {
    try {
      // 0. Cek ketersediaan di S3
      if (this.s3Client && query.recordingMbid) {
        const testKey = this.generateS3Key(query);
        const exists = await fileExists(this.s3Client, { bucket: this.s3BucketName, key: testKey });
        if (exists) {
          logger.info({ fileKey: testKey }, "YouTube track found in S3! Serving direct stream");
          return {
            provider: "local-s3",
            status: "ready",
            quality: "normal",
            format: "m4a",
            url: await generatePresignedUrl(this.s3Client, { bucket: this.s3BucketName, key: testKey }),
          };
        }
      }

      // 1. Coba resolusi cepat menggunakan yt-dlp native
      const ytQuery = `ytsearch1:${query.artist} - ${query.title} official audio`;
      const proc = Bun.spawnSync([
        "yt-dlp",
        "-f", "ba[ext=m4a]/ba",
        "--print", "%(title)s###%(uploader)s###%(duration)s",
        "--get-url",
        ytQuery,
      ]);

      if (proc.exitCode === 0 && proc.stdout) {
        const lines = proc.stdout.toString().trim().split("\n");
        const metadata = lines[0]?.split("###");
        const streamUrl = lines[1]?.trim();

        if (streamUrl?.startsWith("http")) {
          logger.debug({ title: metadata?.[0], uploader: metadata?.[1] }, "Resolved YouTube official audio via yt-dlp");
          return {
            provider: this.name,
            status: "ready",
            quality: "normal",
            format: "m4a",
            url: streamUrl,
          };
        }
      }

      // 2. Fallback via Piped API jika yt-dlp gagal
      const q = encodeURIComponent(`${query.artist} ${query.title} official audio`);
      const res = await fetch(`${this.baseUrl}/search?q=${q}&filter=music_songs`, {
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) return null;
      const data = (await res.json()) as any;
      const firstItem = data.items?.[0];
      if (!firstItem?.url) return null;

      const videoId = firstItem.url.split("v=")[1];
      if (!videoId) return null;

      const streamReq = await fetch(`${this.baseUrl}/streams/${videoId}`, {
        signal: AbortSignal.timeout(6000),
      });
      const streamData = (await streamReq.json()) as any;
      const audioStreams = streamData.audioStreams;
      if (!audioStreams || audioStreams.length === 0) return null;

      audioStreams.sort((a: any, b: any) => b.bitrate - a.bitrate);
      const bestAudio = audioStreams[0];

      return {
        provider: this.name,
        status: "ready",
        quality: "normal",
        format: bestAudio.format === "WEBMA_OPUS" ? "opus" : "m4a",
        url: bestAudio.url,
      };

    } catch (error) {
      logger.warn({ err: error, provider: this.name }, "YouTube audio resolution failed");
      return null;
    }
  }

  /**
   * Mengunduh audio resmi YouTube langsung, menyuntikkan enriched metadata & cover, lalu menyimpannya ke S3 (kualitas normal)
   */
  async download(query: AudioQuery): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const fileKey = this.generateS3Key(query, "m4a");

      // 0. Cek S3 idempotency
      if (this.s3Client) {
        const exists = await fileExists(this.s3Client, { bucket: this.s3BucketName, key: fileKey });
        if (exists) {
          logger.info({ fileKey }, "YouTube track already exists in S3. Download skipped.");
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

      logger.info({ title: query.title, artist: query.artist }, "Downloading official audio from YouTube via yt-dlp...");

      // 1. Download buffer langsung via yt-dlp stdout
      const ytQuery = `ytsearch1:${query.artist} - ${query.title} official audio`;
      const proc = Bun.spawnSync([
        "yt-dlp",
        "-f", "ba[ext=m4a]/ba",
        "-o", "-",
        ytQuery,
      ]);

      let audioBuffer: Buffer | null = null;

      if (proc.exitCode === 0 && proc.stdout && proc.stdout.length > 0) {
        audioBuffer = Buffer.from(proc.stdout);
      } else {
        // Fallback: download via URL jika buffer pipe stdout gagal
        const streamResult = await this.find(query);
        if (streamResult?.url) {
          const res = await fetch(streamResult.url);
          if (res.ok) {
            audioBuffer = Buffer.from(await res.arrayBuffer());
          }
        }
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        return { success: false, message: "Failed to download audio track from YouTube." };
      }

      // 2. Suntikkan enriched metadata dan cover artwork ke audio buffer
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

      // 3. Upload ke S3
      if (this.s3Client) {
        await uploadFile(this.s3Client, {
          bucket: this.s3BucketName,
          key: fileKey,
          body: finalBuffer,
          contentType: "audio/mp4",
        });

        logger.info({ fileKey, sizeMb: (finalBuffer.length / 1024 / 1024).toFixed(2) }, "Uploaded YouTube track to S3 successfully");

        const presignedUrl = await generatePresignedUrl(this.s3Client, { bucket: this.s3BucketName, key: fileKey });

        return {
          success: true,
          message: "Downloaded from YouTube, tagged with enriched metadata, and stored to S3 successfully",
          data: {
            s3Key: fileKey,
            sizeMb: (finalBuffer.length / 1024 / 1024).toFixed(2),
            quality: "normal",
            format: "m4a",
            streamUrl: presignedUrl,
          },
        };
      }

      return {
        success: true,
        message: "Audio stream resolved successfully",
        data: {
          format: "m4a",
          quality: "normal",
        },
      };

    } catch (error) {
      logger.error({ err: error }, "YouTube download failed");
      return { success: false, message: `YouTube download error: ${String(error)}` };
    }
  }
}
