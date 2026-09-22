import { logger } from "@audiwav/logger";
import type { AudioProvider, AudioQuery, AudioResult } from "./types";

/**
 * AudioFinder mengatur strategi pencarian Audio.
 */
export class AudioFinder {
  private readonly providers: AudioProvider[];

  constructor(providers: AudioProvider[]) {
    if (providers.length === 0) {
      throw new Error("At least one audio provider must be configured");
    }
    this.providers = providers;
  }

  /**
   * Strategi Pencarian Pintar (*Smart Fallback*):
   * 1. Hubungi provider satu per-satu secara berurutan (Slskd -> JioSaavn -> YouTube).
   * 2. Jika `slskd` mengembalikan "downloading", TAHAN hasil itu (sebagai `backgroundTask`), dan LANJUT mecari fallback.
   * 3. Jika fallback selanjutnya berhasil (menyediakan URL ready), gabungkan URL *streaming* tersebut
   *    ke dalam object `backgroundTask` awal sebagai `.fallback`. User mendengarkan m4a hari ini, mendengarkan FLAC besok.
   */
  async find(query: AudioQuery): Promise<AudioResult | null> {
    let backgroundTask: AudioResult | null = null;
    const errors: Error[] = [];

    logger.debug(
      { artist: query.artist, title: query.title },
      "Starting audio stream resolution",
    );

    for (const provider of this.providers) {
      try {
        const result = await provider.find(query);

        if (!result) continue;

        if (result.status === "ready") {
          logger.info(
            { provider: provider.name, format: result.format, quality: result.quality },
            "Found ready-to-play audio stream",
          );

          // Skenario Emas 1: Jika Slskd (atau primary provider) sudah 'ready' (berarti FLAC ada di cache storage)
          if (!backgroundTask) {
             return result;
          }

          // Skenario Emas 2: Slskd sedang "downloading", maka siapkan URL streaming ini sebagai senjata fallback!
          if (backgroundTask && result.url) {
            logger.info("Injecting fallback stream into downloading task");
            
            backgroundTask.fallback = {
              provider: result.provider,
              quality: result.quality,
              format: result.format,
              url: result.url,
            };
            
            // Kita sudah dapat stream sementara, tidak perlul mengecek YouTube/Provider bawah lagi.
            return backgroundTask;
          }
        }

        if (result.status === "downloading" && !backgroundTask) {
          logger.info(
            { provider: provider.name },
            "Background lossless download triggered. Falling back to fetch real-time stream...",
          );
          // Simpan tugas ini, jangan di-return. Beri kesempatan loop lanjut ke provider selanjutnya.
          backgroundTask = result; 
        }

      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
        logger.warn(
          { err: error, provider: provider.name },
          "Audio provider evaluation failed",
        );
      }
    }

    // Jika sampai akhir loop tidak ada satupun URL Fallback ready yang ditemukan,
    // tapi backgroundTask berjalan (misal JioSaavn dan Youtube kena block API).
    // Maka kembalikan `backgroundTask` as-is tanpa `.fallback`.
    if (backgroundTask) {
      logger.info(
        "No ready fallback stream found. Returning raw background downloading status.",
      );
      return backgroundTask;
    }

    return null;
  }
}
