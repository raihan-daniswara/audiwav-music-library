import { logger } from "@audiwav/logger";
import {
  fileExists,
  findFirstObjectKeyByPrefix,
  generatePresignedUrl,
  generateTrackKey,
  sanitizeFileName,
  type S3Client,
} from "@audiwav/storage";
import type { AudioProvider, AudioQuery, AudioResult } from "../core/types";
import type { SlskdSearchResponse } from "../core/index"; 

export interface SlskdOptions {
  apiUrl?: string;
  apiKey?: string;
  searchTimeoutMs?: number;
  s3Client?: S3Client;
  s3BucketName?: string;
}

export interface SlskdCandidate {
  username: string;
  filename: string;
  size: number;
  uploadSpeed: number;
  hasFreeSlot: boolean;
  queueLength: number;
  bitDepth?: number;
  sampleRate?: number;
  bitRate?: number;
  isHiRes: boolean;
}

interface SlskdPeerResponse {
  username: string;
  uploadSpeed?: number;
  queueLength?: number;
  hasFreeUploadSlot?: boolean;
  files: Array<{
    filename: string;
    size: number;
    extension?: string;
    bitDepth?: number;
    sampleRate?: number;
    bitRate?: number;
    isLocked?: boolean;
  }>;
}

/**
 * Menghitung ukuran minimum wajar untuk file FLAC (dalam bytes)
 * berdasarkan durasi (detik) untuk memfilter fake FLAC / MP3 transcode.
 * 
 * Standar CD FLAC 16-bit paling rendah umumnya ~600 kbps (75 KB/s).
 * Jika durasi tidak diketahui, default minimum adalah 12 MB.
 */
export function calculateMinFlacSize(durationSeconds?: number): number {
  if (!durationSeconds || durationSeconds <= 0) {
    return 12 * 1024 * 1024; // 12 MB minimum
  }
  // 600 kbps = 75 KB per detik = 75 * 1024 bytes per detik
  const estimatedMin = durationSeconds * 75 * 1024;
  return Math.max(estimatedMin, 8 * 1024 * 1024); // Minimal 8 MB
}

export class SlskdProvider implements AudioProvider {
  readonly name = "slskd";

  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly searchTimeoutMs: number;
  private readonly s3Client?: S3Client;
  private readonly s3BucketName: string;

  constructor(options: SlskdOptions = {}) {
    this.apiUrl = options.apiUrl ?? "http://localhost:5030/api/v1";
    this.apiKey = options.apiKey ?? "audiwavslskdapikey123";
    this.searchTimeoutMs = options.searchTimeoutMs ?? 5000;
    
    this.s3Client = options.s3Client;
    this.s3BucketName = options.s3BucketName ?? "audiwav-tracks";
  }

  private get headers(): Record<string, string> {
    return {
      "X-API-KEY": this.apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
  }
  
  private generateS3Key(query: AudioQuery): string {
    const quality = query.quality === "high" || query.quality === "normal" ? query.quality : "lossless";
    const format = quality === "lossless" ? "flac" : "mp3";
    if (query.recordingMbid) {
      return generateTrackKey({
        quality,
        format,
        id: query.recordingMbid,
        artist: query.artist,
        title: query.title,
      });
    }
    const cleanArtist = sanitizeFileName(query.artist);
    const cleanTitle = sanitizeFileName(query.title);
    return `${quality}/${cleanArtist} - ${cleanTitle}.${format}`;
  }

  async find(query: AudioQuery): Promise<AudioResult | null> {
    try {
      if (this.s3Client) {
        let matchedKey: string | null = null;

        // 1. Cek quality path utama: lossless/{recordingMbid}.flac
        if (query.recordingMbid) {
          const directQualityKey = `lossless/${query.recordingMbid}.flac`;
          if (await fileExists(this.s3Client, { bucket: this.s3BucketName, key: directQualityKey })) {
            matchedKey = directQualityKey;
          } else {
            // Fallback cek legacy format flac/{recordingMbid}.flac
            const legacyKey = `flac/${query.recordingMbid}.flac`;
            if (await fileExists(this.s3Client, { bucket: this.s3BucketName, key: legacyKey })) {
              matchedKey = legacyKey;
            } else {
              // Fallback cek legacy folder prefix flac/{recordingMbid}/
              matchedKey = await findFirstObjectKeyByPrefix(this.s3Client, {
                bucket: this.s3BucketName,
                prefix: `flac/${query.recordingMbid}/`,
              });
            }
          }
        }

        // 2. Jika belum ketemu, cek exact generated key
        if (!matchedKey) {
          const exactKey = this.generateS3Key(query);
          const exists = await fileExists(this.s3Client, { bucket: this.s3BucketName, key: exactKey });
          if (exists) matchedKey = exactKey;
        }
        
        if (matchedKey) {
          logger.info({ fileKey: matchedKey }, "FLAC found in S3! Serving direct lossless stream");
          return {
            provider: "local-s3",
            status: "ready", 
            quality: "lossless",
            format: "flac",
            url: await generatePresignedUrl(this.s3Client, { bucket: this.s3BucketName, key: matchedKey }),
          };
        }
      }
      return { provider: this.name, status: "downloading", quality: "lossless", format: "flac" };

    } catch (error) {
       return null;
    }
  }

  async triggerDownload(query: AudioQuery): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // 0. Cek terlebih dahulu apakah file sudah ada di S3!
      // Jika sudah ada di S3, jangan download ulang!
      if (this.s3Client) {
        let existingKey: string | null = null;

        if (query.recordingMbid) {
          const directQualityKey = `lossless/${query.recordingMbid}.flac`;
          if (await fileExists(this.s3Client, { bucket: this.s3BucketName, key: directQualityKey })) {
            existingKey = directQualityKey;
          } else {
            const legacyKey = `flac/${query.recordingMbid}.flac`;
            if (await fileExists(this.s3Client, { bucket: this.s3BucketName, key: legacyKey })) {
              existingKey = legacyKey;
            } else {
              existingKey = await findFirstObjectKeyByPrefix(this.s3Client, {
                bucket: this.s3BucketName,
                prefix: `flac/${query.recordingMbid}/`,
              });
            }
          }
        }

        if (!existingKey) {
          const directKey = this.generateS3Key(query);
          const directExists = await fileExists(this.s3Client, { bucket: this.s3BucketName, key: directKey });
          if (directExists) existingKey = directKey;
        }

        if (existingKey) {
          logger.info({ fileKey: existingKey }, "Track already downloaded and exists in S3. Skipping slskd download.");
          const streamUrl = await generatePresignedUrl(this.s3Client, { bucket: this.s3BucketName, key: existingKey });
          return {
            success: true,
            message: "Track already exists in S3 (lossless). Download skipped.",
            data: {
              alreadyDownloaded: true,
              s3Key: existingKey,
              streamUrl,
            },
          };
        }
      }

      const searchTerm = `${query.artist} ${query.title} flac`;
      
      logger.debug({ searchTerm, apiUrl: this.apiUrl }, "Initiating Slskd search request");

      // 1. Inisiasi search dengan body JSON yang sesuai schema .NET
      const searchInitiate = await fetch(`${this.apiUrl}/searches`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ 
          searchText: searchTerm,
        }),
      });

      if (!searchInitiate.ok) {
        const errText = await searchInitiate.text().catch(() => "");
        logger.error({ status: searchInitiate.status, errText }, "Slskd search POST failed");
        return { success: false, message: `Slskd search POST failed (${searchInitiate.status}): ${errText}` };
      }

      const searchJob = (await searchInitiate.json()) as SlskdSearchResponse;
      
      // 2. Beri waktu peer mengumpulkan data
      await new Promise((resolve) => setTimeout(resolve, this.searchTimeoutMs));

      // 3. Endpoint responses di slskd adalah GET /searches/{id}/responses
      const resultsRes = await fetch(`${this.apiUrl}/searches/${searchJob.id}/responses`, { 
        headers: this.headers,
      });

      if (!resultsRes.ok) {
         return { success: false, message: "Failed to fetch search responses from Slskd" };
      }

      const responsesData = (await resultsRes.json()) as SlskdPeerResponse[];

      // Hitung ukuran minimum yang valid berdasarkan durasi (untuk tolak fake FLAC / MP3 transcode)
      const minValidSize = calculateMinFlacSize(query.duration);
      const candidates: SlskdCandidate[] = [];

      for (const response of responsesData || []) {
        for (const file of response.files || []) {
          // Lewati jika file di-lock oleh peer
          if (file.isLocked) continue;

          const isFlac = file.extension?.toLowerCase() === "flac" || file.filename?.toLowerCase().endsWith(".flac");
          if (!isFlac) continue;

          // 1. VALIDASI UKURAN MINIMUM (TOLAK MP3 TRANSCODE / FAKE FLAC)
          if ((file.size ?? 0) < minValidSize) {
            logger.debug(
              { file: file.filename, size: file.size, minValidSize },
              "Skipping candidate: file size too small for genuine FLAC (possible fake/transcode)",
            );
            continue;
          }

          // Cek apakah kandidat adalah Hi-Res (24-bit atau 96kHz+)
          const bitDepth = file.bitDepth ?? 16;
          const sampleRate = file.sampleRate ?? 44100;
          const isHiRes = bitDepth >= 24 || sampleRate >= 88200;

          candidates.push({
            username: response.username,
            filename: file.filename,
            size: file.size,
            uploadSpeed: response.uploadSpeed ?? 0,
            hasFreeSlot: Boolean(response.hasFreeUploadSlot),
            queueLength: response.queueLength ?? 0,
            bitDepth,
            sampleRate,
            bitRate: file.bitRate,
            isHiRes,
          });
        }
      }

      // Urutkan kandidat:
      // Prioritas 1: Hi-Res FLAC (24-bit / 96kHz+) diutamakan paling depan
      // Prioritas 2: Peer yang memiliki slot upload kosong langsung (hasFreeSlot)
      // Prioritas 3: Transfer rate / uploadSpeed tertinggi (Bytes per detik)
      // Prioritas 4: Antrean tersingkat (queueLength terkecil)
      const sortedCandidates = candidates.sort((a, b) => {
        if (a.isHiRes !== b.isHiRes) {
          return a.isHiRes ? -1 : 1; // Prioritaskan 24-bit
        }
        if (a.hasFreeSlot !== b.hasFreeSlot) {
          return a.hasFreeSlot ? -1 : 1;
        }
        if (b.uploadSpeed !== a.uploadSpeed) {
          return b.uploadSpeed - a.uploadSpeed;
        }
        return a.queueLength - b.queueLength;
      });

      const bestCandidate = sortedCandidates[0];

      if (!bestCandidate) {
        return { 
          success: false, 
          message: "No genuine lossless FLAC format found from peers for this song (yet). Try again shortly.",
          data: { searchId: searchJob.id },
        };
      }

      logger.info(
        {
          user: bestCandidate.username,
          speedKbps: (bestCandidate.uploadSpeed / 1024).toFixed(1),
          queue: bestCandidate.queueLength,
          freeSlot: bestCandidate.hasFreeSlot,
          isHiRes: bestCandidate.isHiRes,
          bitDepth: bestCandidate.bitDepth,
          sampleRate: bestCandidate.sampleRate,
          candidateCount: sortedCandidates.length,
        },
        "Selected best FLAC candidate",
      );

      // 4. Trigger download ke slskd: POST /transfers/downloads/{username}
      const dlRes = await fetch(`${this.apiUrl}/transfers/downloads/${encodeURIComponent(bestCandidate.username)}`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify([{ filename: bestCandidate.filename, size: bestCandidate.size }]),
      });

      if (!dlRes.ok) {
        const dlErr = await dlRes.text().catch(() => "");
        return { success: false, message: `Failed to trigger download from user ${bestCandidate.username}: ${dlErr}` };
      }

      return { 
        success: true, 
        message: "Download job queued successfully in Slskd",
        data: { 
          username: bestCandidate.username, 
          filename: bestCandidate.filename, 
          sizeMb: (bestCandidate.size / 1024 / 1024).toFixed(2),
          uploadSpeedKbps: (bestCandidate.uploadSpeed / 1024).toFixed(1),
          hasFreeSlot: bestCandidate.hasFreeSlot,
          queueLength: bestCandidate.queueLength,
          bitDepth: bestCandidate.bitDepth,
          sampleRate: bestCandidate.sampleRate,
          isHiRes: bestCandidate.isHiRes,
          candidates: sortedCandidates, // Disertakan untuk auto-failover
        },
      };

    } catch (error) {
      logger.error({ err: error }, "Slskd triggerDownload internal error");
      return { success: false, message: `Internal Engine Error: ${String(error)}` };
    }
  }
}
