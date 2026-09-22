import { logger } from "@audiwav/logger";
import type { LyricProvider, LyricQuery, LyricResult } from "./types";

/**
 * LyricFinder mengatur urutan pencarian lirik menggunakan strategi Fallback.
 */
export class LyricFinder {
  private readonly providers: LyricProvider[];

  constructor(providers: LyricProvider[]) {
    if (providers.length === 0) {
      throw new Error("At least one lyric provider must be configured");
    }
    this.providers = providers;
  }

  /**
   * Mencari lirik secara berurutan (*fallback mode*).
   * 
   * Aturan:
   * 1. Jika provider mengembalikan `line` atau `word` synced lyrics, langsung kembalikan hasilnya.
   * 2. Jika provider mengembalikan `none` (plain text), simpan sementara, lalu cek provider berikutnya (siapa tahu punya versi synced).
   * 3. Jika semua provider sudah dicek dan tidak ada yang synced, kembalikan hasil plain text (jika ada).
   */
  async find(query: LyricQuery): Promise<LyricResult | null> {
    let bestPlainLyrics: LyricResult | null = null;
    const errors: Error[] = [];

    logger.debug(
      { artist: query.artist, title: query.title, album: query.album },
      "Starting lyrics fallback search",
    );

    for (const provider of this.providers) {
      try {
        logger.debug({ provider: provider.name }, "Attempting to fetch lyrics");
        const result = await provider.find(query);

        if (!result) {
          continue;
        }

        // Jika lagu instrumental, kita bisa langsung setuju dan berhenti mencari.
        if (result.instrumental) {
          logger.info(
            { provider: provider.name },
            "Found instrumental marker",
          );
          return result;
        }

        // Jika punya sinkronisasi waktu, ini adalah hasil terbaik! Langsung return.
        if (result.syncType === "line" || result.syncType === "word") {
          logger.info(
            { provider: provider.name, syncType: result.syncType },
            "Successfully found synced lyrics",
          );
          return result;
        }

        // Jika hanya plain text, simpan sebagai cadangan jika ini yang pertama ditemukan
        if (result.syncType === "none" && !bestPlainLyrics) {
          logger.debug(
            { provider: provider.name },
            "Found plain text lyrics as potential fallback",
          );
          bestPlainLyrics = result;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);
        logger.warn(
          { err, provider: provider.name },
          "Lyric provider evaluation failed",
        );
      }
    }

    // Jika gagal mendapat synced lyrics, kembalikan plain lyrics yang ditemukan (jika ada).
    if (bestPlainLyrics) {
      logger.info(
        { provider: bestPlainLyrics.provider },
        "Returning fallback plain text lyrics",
      );
      return bestPlainLyrics;
    }

    logger.debug(
      { errorsCount: errors.length },
      "No lyrics found across all providers",
    );

    return null;
  }
}
