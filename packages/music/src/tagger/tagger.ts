import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { logger } from "@audiwav/logger";
import type { AudioMetadataTags } from "../core/types";

export interface TagAudioOptions {
  audioBuffer: Buffer;
  format: string; // "flac" | "m4a" | "mp3"
  tags: AudioMetadataTags;
}

interface ReplayGainScanResult {
  trackGain?: string;
  trackPeak?: string;
}

/**
 * Menganalisis gelombang audio asli secara dinamis menggunakan filter EBU/ReplayGain FFmpeg.
 * Menghasilkan track_gain (dB) dan track_peak asli lagu secara non-destruktif (<0.3s).
 */
function scanReplayGain(filePath: string): ReplayGainScanResult {
  try {
    const proc = Bun.spawnSync([
      "ffmpeg",
      "-i", filePath,
      "-af", "replaygain",
      "-f", "null",
      "-",
    ]);

    const output = proc.stderr?.toString() ?? "";
    const gainMatch = output.match(/track_gain\s*=\s*([+-]?\d+(?:\.\d+)?)\s*dB/i);
    const peakMatch = output.match(/track_peak\s*=\s*([+-]?\d+(?:\.\d+)?)/i);

    return {
      trackGain: gainMatch ? `${gainMatch[1]} dB` : undefined,
      trackPeak: peakMatch ? peakMatch[1] : undefined,
    };
  } catch (err) {
    logger.warn({ err }, "ReplayGain dynamic audio scan failed");
    return {};
  }
}

/**
 * Menyuntikkan metadata (Title, Artist, Album, Year, Track, Genre, MusicBrainz ID),
 * ReplayGain loudness normalization tags asli, serta menyematkan Artwork Cover Album
 * langsung ke file audio menggunakan FFmpeg lossless copy (-c copy).
 * 
 * Tidak mengubah kualitas/bitstream audio sama sekali, dan durasi audio tetap dihitung
 * dari bitstream fisik lagu itu sendiri.
 */
export async function tagAudioBuffer(options: TagAudioOptions): Promise<Buffer> {
  const { audioBuffer, format, tags } = options;
  const cleanExt = format.toLowerCase().replace(/^\./, "");
  const id = randomUUID();

  const tempInPath = path.join("/tmp", `audiwav-in-${id}.${cleanExt}`);
  const tempOutPath = path.join("/tmp", `audiwav-out-${id}.${cleanExt}`);
  const tempCoverPath = path.join("/tmp", `audiwav-cover-${id}.jpg`);

  let coverDownloaded = false;

  try {
    // 1. Tulis buffer audio ke file temporary
    fs.writeFileSync(tempInPath, audioBuffer);

    // 2. Scan ReplayGain asli dari gelombang audio secara dinamis
    const rg = scanReplayGain(tempInPath);
    if (rg.trackGain && rg.trackPeak) {
      logger.debug(
        { trackGain: rg.trackGain, trackPeak: rg.trackPeak, file: path.basename(tempInPath) },
        "Calculated dynamic ReplayGain values for track",
      );
    }

    // 3. Unduh cover artwork jika tersedia di tags
    if (tags.artworkUrl && tags.artworkUrl.startsWith("http")) {
      try {
        // Upgrade thumbnail iTunes dari 600x600 ke 1400x1400 untuk kualitas HD
        let artUrl = tags.artworkUrl;
        if (artUrl.includes("600x600bb.jpg")) {
          artUrl = artUrl.replace("600x600bb.jpg", "1400x1400bb.jpg");
        }

        const artRes = await fetch(artUrl, { signal: AbortSignal.timeout(6000) });
        if (artRes.ok) {
          const artBuffer = Buffer.from(await artRes.arrayBuffer());
          if (artBuffer.length > 0) {
            fs.writeFileSync(tempCoverPath, artBuffer);
            coverDownloaded = true;
          }
        }
      } catch (artErr) {
        logger.warn({ err: artErr, url: tags.artworkUrl }, "Failed to download artwork for tagging, proceeding without cover");
      }
    }

    // 4. Susun argumen ffmpeg
    const ffmpegArgs = ["ffmpeg", "-y", "-i", tempInPath];

    if (coverDownloaded) {
      ffmpegArgs.push("-i", tempCoverPath, "-map", "0:a", "-map", "1:v", "-disposition:v:0", "attached_pic");
    } else {
      ffmpegArgs.push("-map", "0:a");
    }

    // Lossless copy tanpa re-encoding
    ffmpegArgs.push("-c", "copy");

    // Khusus kontainer MP4/M4A: izinkan custom metadata tags
    if (cleanExt === "m4a" || cleanExt === "mp4") {
      ffmpegArgs.push("-movflags", "use_metadata_tags");
    }

    // Standard metadata tags
    if (tags.title) ffmpegArgs.push("-metadata", `title=${tags.title}`);
    if (tags.artist) ffmpegArgs.push("-metadata", `artist=${tags.artist}`);
    if (tags.album) ffmpegArgs.push("-metadata", `album=${tags.album}`);

    const releaseDate = tags.releaseYear?.toString() || tags.releaseDate;
    if (releaseDate) ffmpegArgs.push("-metadata", `date=${releaseDate}`);

    if (tags.genre) ffmpegArgs.push("-metadata", `genre=${tags.genre}`);

    if (tags.trackNumber) {
      const trackStr = tags.trackCount ? `${tags.trackNumber}/${tags.trackCount}` : `${tags.trackNumber}`;
      ffmpegArgs.push("-metadata", `track=${trackStr}`);
    }

    if (tags.discNumber) {
      const discStr = tags.discCount ? `${tags.discNumber}/${tags.discCount}` : `${tags.discNumber}`;
      ffmpegArgs.push("-metadata", `disc=${discStr}`);
    }

    if (tags.recordingMbid) {
      ffmpegArgs.push("-metadata", `MUSICBRAINZ_TRACKID=${tags.recordingMbid}`);
    }

    // Dynamic ReplayGain metadata tags
    if (rg.trackGain && rg.trackPeak) {
      if (cleanExt === "flac") {
        ffmpegArgs.push(
          "-metadata", `REPLAYGAIN_TRACK_GAIN=${rg.trackGain}`,
          "-metadata", `REPLAYGAIN_TRACK_PEAK=${rg.trackPeak}`,
          "-metadata", `REPLAYGAIN_ALBUM_GAIN=${rg.trackGain}`,
          "-metadata", `REPLAYGAIN_ALBUM_PEAK=${rg.trackPeak}`,
        );
      } else {
        // M4A / MP3 tags
        ffmpegArgs.push(
          "-metadata", `replaygain_track_gain=${rg.trackGain}`,
          "-metadata", `replaygain_track_peak=${rg.trackPeak}`,
          "-metadata", `replaygain_album_gain=${rg.trackGain}`,
          "-metadata", `replaygain_album_peak=${rg.trackPeak}`,
        );
      }
    }

    // Spesifik MP3 ID3v2 attached picture
    if (cleanExt === "mp3" && coverDownloaded) {
      ffmpegArgs.push("-id3v2_version", "3", "-metadata:s:v", "title=Album cover", "-metadata:s:v", "comment=Cover (front)");
    }

    ffmpegArgs.push(tempOutPath);

    const proc = Bun.spawnSync(ffmpegArgs);

    if (proc.exitCode === 0 && fs.existsSync(tempOutPath)) {
      const taggedBuffer = fs.readFileSync(tempOutPath);
      logger.info(
        {
          title: tags.title,
          artist: tags.artist,
          album: tags.album,
          hasArtwork: coverDownloaded,
          replayGain: rg.trackGain,
          sizeMb: (taggedBuffer.length / 1024 / 1024).toFixed(2),
        },
        "Successfully injected enriched metadata, dynamic ReplayGain & artwork into audio file",
      );
      return taggedBuffer;
    }

    logger.warn({ stderr: proc.stderr?.toString() }, "ffmpeg tagging failed, using original audio buffer as fallback");
    return audioBuffer;

  } catch (err) {
    logger.error({ err }, "Error occurred while tagging audio buffer");
    return audioBuffer;
  } finally {
    try {
      if (fs.existsSync(tempInPath)) fs.unlinkSync(tempInPath);
      if (fs.existsSync(tempOutPath)) fs.unlinkSync(tempOutPath);
      if (fs.existsSync(tempCoverPath)) fs.unlinkSync(tempCoverPath);
    } catch {
      // Ignore temporary file cleanup errors
    }
  }
}
