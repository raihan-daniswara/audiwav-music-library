import { randomUUID } from "node:crypto";
import { logger } from "@audiwav/logger";
import { uploadFile, generateTrackKey, type S3Client } from "@audiwav/storage";
import type { AudioMetadataTags } from "../core/types";
import type { SlskdCandidate } from "../slskd/client";
import { tagAudioBuffer } from "../tagger";

export interface SyncWorkerOptions {
  slskdApiUrl?: string;
  slskdApiKey?: string;
  s3Client: S3Client;
  s3BucketName?: string;
  containerName?: string;
}

export interface CompletedDownload {
  id: string;
  username: string;
  filename: string;
  size: number;
}

export interface SyncResult {
  fileId: string;
  s3Key: string;
  originalFilename: string;
  sizeMb: string;
}

export interface WatchDownloadParams {
  username: string;
  filename: string;
  artist?: string;
  title?: string;
  album?: string;
  releaseYear?: number;
  releaseDate?: string;
  genre?: string;
  trackNumber?: number;
  trackCount?: number;
  discNumber?: number;
  discCount?: number;
  recordingMbid?: string;
  artworkUrl?: string;
  maxWaitMs?: number;
  intervalMs?: number;
  candidates?: SlskdCandidate[];
}

/**
 * SlskdSyncWorker:
 * Memeriksa transfer slskd yang sudah selesai (State: 'Completed, Succeeded'),
 * membaca filenya, menyuntikkan enriched metadata & cover, lalu meng-upload ke S3
 * dengan format terstandarisasi berdasarkan Quality:
 * /{quality}/{recording_mbid}.{format}
 * Dilengkapi dengan auto-failover jika peer menolak (Completed, Rejected / Cancelled / Errored).
 */
export class SlskdSyncWorker {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly s3Client: S3Client;
  private readonly s3BucketName: string;
  private readonly containerName: string;

  constructor(options: SyncWorkerOptions) {
    this.apiUrl = options.slskdApiUrl ?? "http://localhost:5030/api/v1";
    this.apiKey = options.slskdApiKey ?? "audiwavslskdapikey123";
    this.s3Client = options.s3Client;
    this.s3BucketName = options.s3BucketName ?? "audiwav-tracks";
    this.containerName = options.containerName ?? "audiwav-slskd";
  }

  private get headers(): Record<string, string> {
    return {
      "X-API-KEY": this.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  /**
   * Mengambil daftar download dari slskd yang sudah selesai sukses (Completed, Succeeded).
   */
  async getCompletedDownloads(): Promise<CompletedDownload[]> {
    try {
      const res = await fetch(`${this.apiUrl}/transfers/downloads`, {
        headers: this.headers,
      });

      if (!res.ok) {
        logger.error({ status: res.status }, "Failed to fetch downloads from slskd");
        return [];
      }

      const users = (await res.json()) as Array<{
        username: string;
        directories: Array<{
          files: Array<{
            id: string;
            filename: string;
            size: number;
            state: string;
          }>;
        }>;
      }>;

      const completed: CompletedDownload[] = [];

      for (const user of users || []) {
        for (const dir of user.directories || []) {
          for (const file of dir.files || []) {
            if (file.state === "Completed, Succeeded") {
              completed.push({
                id: file.id,
                username: user.username,
                filename: file.filename,
                size: file.size,
              });
            }
          }
        }
      }

      return completed;
    } catch (err) {
      logger.error({ err }, "SlskdSyncWorker getCompletedDownloads error");
      return [];
    }
  }

  /**
   * Menemukan path absolut file di dalam filesystem container /app/downloads
   */
  private findFileInContainer(filename: string): string | null {
    const parts = filename.split(/[/\\\\]/);
    const basename = parts[parts.length - 1] ?? filename;

    const proc = Bun.spawnSync([
      "docker",
      "exec",
      this.containerName,
      "find",
      "/app/downloads",
      "-name",
      basename,
      "-type",
      "f",
    ]);

    const stdout = proc.stdout ? proc.stdout.toString().trim() : "";
    if (!stdout) {
      return null;
    }

    const firstLine = stdout.split("\n")[0];
    return firstLine ?? null;
  }

  /**
   * Mengunggah file dari container ke S3 secara langsung setelah disuntik metadata
   */
  private async uploadContainerFileToS3(
    containerPath: string,
    s3Key: string,
    tags?: AudioMetadataTags,
    contentType?: string,
  ): Promise<boolean> {
    const readProc = Bun.spawnSync(["docker", "exec", this.containerName, "cat", containerPath]);
    const fileBuffer = readProc.stdout;

    if (!fileBuffer || fileBuffer.length === 0) {
      logger.error({ containerPath }, "Read 0 bytes from downloaded file");
      return false;
    }

    const fileExt = s3Key.split(".").pop()?.toLowerCase() ?? "flac";

    let finalBuffer = Buffer.from(fileBuffer as any);
    if (tags) {
      finalBuffer = await tagAudioBuffer({
        audioBuffer: finalBuffer,
        format: fileExt,
        tags,
      });
    }

    const inferredContentType =
      contentType ??
      (s3Key.endsWith(".flac")
        ? "audio/flac"
        : s3Key.endsWith(".mp3")
          ? "audio/mpeg"
          : s3Key.endsWith(".m4a")
            ? "audio/mp4"
            : "application/octet-stream");

    await uploadFile(this.s3Client, {
      bucket: this.s3BucketName,
      key: s3Key,
      body: finalBuffer,
      contentType: inferredContentType,
    });

    return true;
  }

  /**
   * Hapus file unduhan lokal di container agar hemat disk setelah sukses ke S3
   */
  private removeFileFromContainer(containerPath: string): void {
    try {
      Bun.spawnSync(["docker", "exec", this.containerName, "rm", "-f", containerPath]);
      logger.debug({ containerPath }, "Cleaned up temporary container download file");
    } catch (err) {
      logger.warn({ err, containerPath }, "Failed to clean up container file");
    }
  }

  /**
   * Trigger download ke peer kandidat baru
   */
  private async triggerCandidateDownload(candidate: SlskdCandidate): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiUrl}/transfers/downloads/${encodeURIComponent(candidate.username)}`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify([{ filename: candidate.filename, size: candidate.size }]),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Auto-Watcher: Memantau background download spesifik hingga selesai.
   * Jika status menjadi 'Rejected', 'Cancelled', atau 'Errored',
   * sistem OTOMATIS melakukan failover ke kandidat peer tercepat berikutnya!
   * Saat sukses, menyuntikkan enriched metadata & cover, lalu mengunggah ke S3: {quality}/{recordingMbid}.{format}
   */
  watchAndSync(params: WatchDownloadParams): void {
    const { artist, title, album, recordingMbid, maxWaitMs = 10 * 60 * 1000, intervalMs = 3000 } = params;
    let currentUsername = params.username;
    let currentFilename = params.filename;
    let remainingCandidates = (params.candidates || []).filter(
      (c) => !(c.username === currentUsername && c.filename === currentFilename),
    );

    const startTime = Date.now();
    let isFinished = false;

    logger.info({ username: currentUsername, filename: currentFilename, artist, title, recordingMbid }, "Started auto-watcher with auto-failover");

    const timer = setInterval(async () => {
      try {
        if (isFinished) {
          clearInterval(timer);
          return;
        }

        if (Date.now() - startTime > maxWaitMs) {
          logger.warn({ username: currentUsername }, "Auto-watcher timed out waiting for download");
          clearInterval(timer);
          isFinished = true;
          return;
        }

        const res = await fetch(`${this.apiUrl}/transfers/downloads`, {
          headers: this.headers,
        });

        if (!res.ok) return;

        const users = (await res.json()) as Array<{
          username: string;
          directories: Array<{
            files: Array<{
              id: string;
              filename: string;
              size: number;
              state: string;
            }>;
          }>;
        }>;

        const parts = currentFilename.split(/[/\\\\]/);
        const basename = parts[parts.length - 1] ?? currentFilename;

        let activeFile: { id: string; filename: string; size: number; state: string } | null = null;

        for (const user of users || []) {
          if (user.username !== currentUsername) continue;
          for (const dir of user.directories || []) {
            for (const file of dir.files || []) {
              if (file.filename === currentFilename || file.filename.endsWith(basename)) {
                activeFile = file;
                break;
              }
            }
          }
        }

        if (!activeFile) return;

        // 1. KONDISI SUKSES (Completed, Succeeded)
        if (activeFile.state === "Completed, Succeeded") {
          clearInterval(timer);
          isFinished = true;
          logger.info({ basename }, "Download finished successfully! Auto-syncing to S3...");

          const containerPath = this.findFileInContainer(activeFile.filename);
          if (!containerPath) {
            logger.error({ basename }, "File completed in slskd but not found on container disk");
            return;
          }

          const fileExt = activeFile.filename.split(".").pop()?.toLowerCase() ?? "flac";
          const fileId = recordingMbid || randomUUID();
          const quality = fileExt === "flac" ? "lossless" : "high";
          const s3Key = generateTrackKey({ quality, id: fileId, format: fileExt });

          const metadataTags: AudioMetadataTags = {
            title: title || basename,
            artist: artist || "Unknown Artist",
            album,
            releaseYear: params.releaseYear,
            releaseDate: params.releaseDate,
            genre: params.genre,
            trackNumber: params.trackNumber,
            trackCount: params.trackCount,
            discNumber: params.discNumber,
            discCount: params.discCount,
            recordingMbid,
            artworkUrl: params.artworkUrl,
          };

          const success = await this.uploadContainerFileToS3(containerPath, s3Key, metadataTags);
          if (success) {
            logger.info(
              { s3Key, sizeMb: (activeFile.size / 1024 / 1024).toFixed(2) },
              "Auto-watcher successfully pushed tagged track to S3!",
            );
            this.removeFileFromContainer(containerPath);
          }
          return;
        }

        // 2. KONDISI GAGAL / REJECTED (Completed, Rejected / Cancelled / Errored)
        const isRejectedOrFailed =
          activeFile.state.includes("Rejected") ||
          activeFile.state.includes("Cancelled") ||
          activeFile.state.includes("Errored");

        if (isRejectedOrFailed) {
          logger.warn(
            { username: currentUsername, state: activeFile.state },
            "Peer rejected or download failed! Triggering auto-failover to next peer...",
          );

          if (remainingCandidates.length === 0) {
            logger.error("All peer candidates exhausted or rejected. Download aborted.");
            clearInterval(timer);
            isFinished = true;
            return;
          }

          // Ambil kandidat tercepat berikutnya
          const nextCandidate = remainingCandidates.shift()!;
          logger.info(
            {
              nextUser: nextCandidate.username,
              speedKbps: (nextCandidate.uploadSpeed / 1024).toFixed(1),
              remaining: remainingCandidates.length,
            },
            "Switching to next best peer",
          );

          const ok = await this.triggerCandidateDownload(nextCandidate);
          if (ok) {
            currentUsername = nextCandidate.username;
            currentFilename = nextCandidate.filename;
          }
        }
      } catch (err) {
        logger.error({ err }, "Error in auto-watcher loop");
      }
    }, intervalMs);
  }

  /**
   * Sinkronisasi batch semua file yang sudah selesai di-download ke S3
   */
  async syncAll(): Promise<SyncResult[]> {
    const completedList = await this.getCompletedDownloads();
    const syncedResults: SyncResult[] = [];

    for (const item of completedList) {
      const ext = item.filename.split(".").pop()?.toLowerCase() ?? "flac";

      const containerPath = this.findFileInContainer(item.filename);
      if (!containerPath) {
        continue;
      }

      const fileId = randomUUID();
      const quality = ext === "flac" ? "lossless" : "high";
      const s3Key = generateTrackKey({ quality, id: fileId, format: ext });

      logger.info(
        { from: containerPath, to: s3Key, sizeMb: (item.size / 1024 / 1024).toFixed(2) },
        "Syncing completed download to S3...",
      );

      const success = await this.uploadContainerFileToS3(containerPath, s3Key);
      if (success) {
        syncedResults.push({
          fileId,
          s3Key,
          originalFilename: item.filename,
          sizeMb: (item.size / 1024 / 1024).toFixed(2),
        });
        this.removeFileFromContainer(containerPath);
      }
    }

    return syncedResults;
  }
}
