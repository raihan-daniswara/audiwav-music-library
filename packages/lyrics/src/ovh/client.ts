import { logger } from "@audiwav/logger";
import type { LyricProvider, LyricQuery, LyricResult } from "../core/types";

interface OvhLyricResponse {
  lyrics?: string;
  error?: string;
}

/**
 * LyricsOvhProvider mengambil lirik dari API api.lyrics.ovh.
 * Provider ini hanya akan mengembalikan plain text lyrics (tidak tersinkronisasi)
 * dan digunakan sebagai safe fallback terakhir.
 */
export class LyricsOvhProvider implements LyricProvider {
  readonly name = "lyrics.ovh";

  async find(query: LyricQuery): Promise<LyricResult | null> {
    try {
      const artist = encodeURIComponent(query.artist);
      const title = encodeURIComponent(query.title);
      
      const url = `https://api.lyrics.ovh/v1/${artist}/${title}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      try {
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
           logger.debug({ status: response.status }, "Lyrics.ovh request failed or not found");
           return null;
        }

        const data = (await response.json()) as OvhLyricResponse;

        if (data.lyrics && data.lyrics.trim().length > 0) {
          const plainLyrics = data.lyrics.trim();
          
          return {
            provider: this.name,
            syncType: "none",
            instrumental: false,
            lines: plainLyrics
              .split(/\r?\n/)
              .filter(Boolean)
              .map((text) => ({
                text,
                startMs: 0,
              })),
            plainLyrics: plainLyrics,
          };
        }
      } finally {
        clearTimeout(timeout);
      }

      return null;
    } catch (error) {
      // Ignore network errors/timeouts
      logger.warn({ err: error, provider: this.name }, "Lyrics.ovh fetch error or timeout");
      return null;
    }
  }
}
