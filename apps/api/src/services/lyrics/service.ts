import { logger } from "@audiwav/logger";
import type { LyricFinder, LyricQuery, LyricResult } from "@audiwav/lyrics";

export interface LyricsServiceDependencies {
  finder?: LyricFinder;
}

export class LyricsService {
  private readonly dependencies: LyricsServiceDependencies;

  constructor(dependencies: LyricsServiceDependencies = {}) {
    this.dependencies = dependencies;
  }

  /**
   * Mengambil lirik berdasarkan query pencarian (Artist, Title, dll).
   */
  async getLyrics(query: LyricQuery): Promise<LyricResult | null> {
    const finder = this.dependencies.finder;

    if (!finder) {
      logger.error("LyricsService requires a configured LyricFinder dependency");
      return null;
    }

    try {
      logger.debug(
        { artist: query.artist, title: query.title },
        "Service starting lyric search",
      );

      const result = await finder.find(query);

      return result;
    } catch (error) {
      logger.error(
        { err: error, artist: query.artist, title: query.title },
        "Service failed to find lyrics",
      );
      return null;
    }
  }
}
