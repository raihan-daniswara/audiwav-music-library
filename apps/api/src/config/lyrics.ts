import { createDefaultLyricFinder, type LyricFinder } from "@audiwav/lyrics";

let lyricFinder: LyricFinder | undefined;

/**
 * Membuat LyricFinder (dengan default provider stack) secara lazy.
 *
 * Client hanya dibuat ketika pertama kali dibutuhkan.
 */
export function getLyricFinder(): LyricFinder {
  if (!lyricFinder) {
    lyricFinder = createDefaultLyricFinder();
  }

  return lyricFinder;
}
