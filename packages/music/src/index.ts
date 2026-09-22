export * from "./core";

export * from "./slskd/client";
export * from "./jiosaavn/client";
export * from "./youtube/client";
export * from "./worker/sync";
export * from "./tagger";

import { AudioFinder } from "./core";
import { SlskdProvider, type SlskdOptions } from "./slskd/client";
import { JioSaavnProvider } from "./jiosaavn/client";
import { YouTubeProvider } from "./youtube/client";

/**
 * Membuat MusicFinder dengan Fallback Engine Pintar (Asynchronous + Immediate Playback).\n * \n * Urutan Hierarki Kecepatan & Kualitas:
 * 1. Slskd (Memeriksa Local S3 FLAC -> Jika Kosong, P2P Download dimulai di Latar Belakang).
 * 2. JioSaavn (Dicari HANYA JIKA Local FLAC kosong. Memberi URL MP4 AAC Tinggi).
 * 3. YouTube (Penyelamat terakhir jika lagu super langka).
 */
export function createDefaultAudioFinder(options?: { slskdOptions?: SlskdOptions }): AudioFinder {
  return new AudioFinder([
    new SlskdProvider(options?.slskdOptions),
    new JioSaavnProvider(),
    new YouTubeProvider(),
  ]);
}
