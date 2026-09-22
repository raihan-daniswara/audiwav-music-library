export * from "./core";
export * from "./lrclib/client";
export * from "./netease/client";
export * from "./ovh/client";

import { LyricFinder } from "./core";
import { LrcLibProvider } from "./lrclib/client";
import { NetEaseProvider } from "./netease/client";
import { LyricsOvhProvider } from "./ovh/client";

/**
 * Helper function untuk menginisialisasi LyricFinder 
 * dengan kombinasi provider default terbaik.
 * 
 * Urutan Fallback Default:
 * 1. LRCLIB (Kualitas sinkronisasi paling akurat / standar industri open-source)
 * 2. NetEase (Fallback Sync yang andal + opsi karaoke word-by-word)
 * 3. Lyrics.ovh (Fallback terakhir jika lirik sama sekali tidak ditemukan, akan mereturn lirik Text/Statik).
 */
export function createDefaultLyricFinder(): LyricFinder {
  return new LyricFinder([
    new LrcLibProvider(),
    new NetEaseProvider(),
    new LyricsOvhProvider(),
  ]);
}
