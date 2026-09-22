import { Hono } from "hono";
import { z } from "zod";

import { MusicService } from "../services/music";
import { getAudioFinder } from "../config/music";
import {
  SlskdProvider,
  SlskdSyncWorker,
  JioSaavnProvider,
  YouTubeProvider,
  type AudioQuality,
  type AudioQuery,
} from "@audiwav/music"; 
import { createStorageClient } from "@audiwav/storage";
import { env } from "../config/env";
import { MetadataDetailService } from "../services/metadata";

const musicQuerySchema = z.object({
  title: z.string().trim().min(1),
  artist: z.string().trim().min(1),
  album: z.string().trim().optional(),
  recordingMbid: z.string().trim().optional(),
  duration: z.coerce.number().positive().optional(),
  durationMs: z.coerce.number().positive().optional(),
  releaseYear: z.coerce.number().optional(),
  releaseDate: z.string().trim().optional(),
  genre: z.string().trim().optional(),
  trackNumber: z.coerce.number().optional(),
  trackCount: z.coerce.number().optional(),
  discNumber: z.coerce.number().optional(),
  discCount: z.coerce.number().optional(),
  artworkUrl: z.string().trim().optional(),
});

const downloadParamsSchema = z.object({
  provider: z.enum(["soulseek", "slskd", "jiosaavn", "youtube"]),
  quality: z.enum(["lossless", "high", "normal"]),
});

export const musicRoute = new Hono();

musicRoute.get("/stream", async (c) => {
  const parsed = musicQuerySchema.safeParse({
    title: c.req.query("title"),
    artist: c.req.query("artist"),
    album: c.req.query("album"),
    recordingMbid: c.req.query("recordingMbid"),
    duration: c.req.query("duration"),
    durationMs: c.req.query("durationMs"),
  });

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid query parameters. Both 'title' and 'artist' are required.",
        issues: parsed.error.issues,
      },
      400,
    );
  }

  const service = new MusicService({
    finder: getAudioFinder(),
  });

  const durationSeconds =
    parsed.data.duration ??
    (parsed.data.durationMs ? Math.round(parsed.data.durationMs / 1000) : undefined);

  const streamInfo = await service.getStream({
    title: parsed.data.title,
    artist: parsed.data.artist,
    album: parsed.data.album,
    recordingMbid: parsed.data.recordingMbid,
    duration: durationSeconds,
  });

  if (!streamInfo) {
    return c.json({ error: "Stream unavailable and cannot be fetched via fallback providers." }, 404);
  }

  return c.json({
    status: 200,
    message: "Stream URL retrieved successfully",
    data: streamInfo,
  });
});

/**
 * Endpoint Download Spesifik Provider & Kualitas:
 * POST /api/music/download/:provider/:quality
 * Provider: soulseek | slskd | jiosaavn | youtube
 * Quality: lossless | high | normal
 */
musicRoute.post("/download/:provider/:quality", async (c) => {
  const paramsParsed = downloadParamsSchema.safeParse({
    provider: c.req.param("provider")?.toLowerCase(),
    quality: c.req.param("quality")?.toLowerCase(),
  });

  if (!paramsParsed.success) {
    return c.json(
      {
        error: "Invalid path parameters. Expected /download/:provider/:quality",
        allowedProviders: ["soulseek", "slskd", "jiosaavn", "youtube"],
        allowedQualities: ["lossless", "high", "normal"],
        issues: paramsParsed.error.issues,
      },
      400,
    );
  }

  const { provider, quality } = paramsParsed.data;

  // Validasi kapabilitas kualitas provider
  if (provider === "jiosaavn" && quality === "lossless") {
    return c.json(
      {
        error: "JioSaavn does not provide 'lossless' quality. Supported qualities: 'high' (320kbps AAC), 'normal' (160kbps AAC).",
      },
      400,
    );
  }

  if (provider === "youtube" && quality !== "normal") {
    return c.json(
      {
        error: `YouTube does not provide '${quality}' quality. YouTube public audio streams max out at ~128 kbps AAC. Only 'normal' quality is supported. For 'high' (320 kbps), use JioSaavn or Soulseek. For 'lossless', use Soulseek.`,
      },
      400,
    );
  }

  const body = await c.req.json().catch(() => ({}));
  const bodyParsed = musicQuerySchema.safeParse(body);

  if (!bodyParsed.success) {
    return c.json(
      {
        error: "Invalid JSON body for downloading.",
        issues: bodyParsed.error.issues,
      },
      400,
    );
  }

  const s3Client = createStorageClient({
    endpoint: "http://localhost:9000",
    accessKeyId: env.RUSTFS_ACCESS_KEY,
    secretAccessKey: env.RUSTFS_SECRET_KEY,
  });

  let enrichedMetadata = {
    title: bodyParsed.data.title,
    artist: bodyParsed.data.artist,
    album: bodyParsed.data.album,
    releaseYear: bodyParsed.data.releaseYear,
    releaseDate: bodyParsed.data.releaseDate,
    genre: bodyParsed.data.genre,
    trackNumber: bodyParsed.data.trackNumber,
    trackCount: bodyParsed.data.trackCount,
    discNumber: bodyParsed.data.discNumber,
    discCount: bodyParsed.data.discCount,
    recordingMbid: bodyParsed.data.recordingMbid,
    artworkUrl: bodyParsed.data.artworkUrl,
  };

  // Auto-enrich jika artworkUrl atau info album belum ada di request body
  if (!enrichedMetadata.artworkUrl || !enrichedMetadata.album) {
    try {
      const detailService = new MetadataDetailService();
      const enriched = await detailService.getDetail({
        title: bodyParsed.data.title,
        artist: bodyParsed.data.artist,
        album: bodyParsed.data.album ?? "",
        recordingMbid: bodyParsed.data.recordingMbid,
        sources: ["canonical"],
      });

      if (enriched) {
        enrichedMetadata = {
          title: enriched.title || enrichedMetadata.title,
          artist: enriched.artist || enrichedMetadata.artist,
          album: enrichedMetadata.album || enriched.album,
          releaseYear: enrichedMetadata.releaseYear || enriched.releaseYear,
          releaseDate: enrichedMetadata.releaseDate || enriched.releaseDate,
          genre: enrichedMetadata.genre || enriched.genre,
          trackNumber: enrichedMetadata.trackNumber || enriched.trackNumber,
          trackCount: enrichedMetadata.trackCount || enriched.trackCount,
          discNumber: enrichedMetadata.discNumber || enriched.discNumber,
          discCount: enrichedMetadata.discCount || enriched.discCount,
          recordingMbid: enrichedMetadata.recordingMbid || enriched.recordingMbid,
          artworkUrl: enrichedMetadata.artworkUrl || enriched.artworkUrl,
        };
      }
    } catch {
      // Jika auto-enrichment gagal, fallback menggunakan data bawaan body
    }
  }

  const durationSeconds =
    bodyParsed.data.duration ??
    (bodyParsed.data.durationMs ? Math.round(bodyParsed.data.durationMs / 1000) : undefined);

  const query: AudioQuery = {
    ...enrichedMetadata,
    duration: durationSeconds,
    durationMs: bodyParsed.data.durationMs,
    quality: quality as AudioQuality,
  };

  // 1. PROVIDER: SOULSEEK / SLSKD (P2P Lossless FLAC / High MP3 320k)
  if (provider === "soulseek" || provider === "slskd") {
    const slskdProvider = new SlskdProvider({
      apiKey: env.SLSKD_API_KEY,
      s3Client,
      s3BucketName: "audiwav-tracks",
    });

    const result = await slskdProvider.triggerDownload(query);

    if (!result.success) {
      return c.json({ status: 500, error: result.message, ...result }, 500);
    }

    // Jika belum ada di S3, jalankan background auto-watcher & sync ke S3
    if (!result.data?.alreadyDownloaded && result.data?.username && result.data?.filename) {
      const worker = new SlskdSyncWorker({
        slskdApiKey: env.SLSKD_API_KEY,
        s3Client,
        s3BucketName: "audiwav-tracks",
      });

      worker.watchAndSync({
        ...query,
        username: result.data.username,
        filename: result.data.filename,
        candidates: result.data.candidates,
      });
    }

    return c.json({
      status: 200,
      provider: "soulseek",
      quality,
      ...result,
    });
  }

  // 2. PROVIDER: JIOSAAVN (Direct CDN High 320kbps AAC / Normal 160kbps -> S3)
  if (provider === "jiosaavn") {
    const jioSaavnProvider = new JioSaavnProvider({
      s3Client,
      s3BucketName: "audiwav-tracks",
    });

    const result = await jioSaavnProvider.download(query);

    if (!result.success) {
      return c.json({ status: 500, error: result.message }, 500);
    }

    return c.json({
      status: 200,
      provider: "jiosaavn",
      quality,
      ...result,
    });
  }

  // 3. PROVIDER: YOUTUBE (Direct CDN Stream -> S3, strictly normal quality ~128kbps)
  if (provider === "youtube") {
    const youtubeProvider = new YouTubeProvider({
      s3Client,
      s3BucketName: "audiwav-tracks",
    });

    const result = await youtubeProvider.download(query);

    if (!result.success) {
      return c.json({ status: 500, error: result.message }, 500);
    }

    return c.json({
      status: 200,
      provider: "youtube",
      quality,
      ...result,
    });
  }

  return c.json({ error: "Unsupported provider" }, 400);
});
