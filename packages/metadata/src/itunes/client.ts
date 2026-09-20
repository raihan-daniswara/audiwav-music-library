import { logger } from "@audiwav/logger";

import type { ITunesSearchResponse } from "./types";

const ITUNES_API_URL = "https://itunes.apple.com/search";

/**
 * Client sederhana untuk iTunes Search API.
 */
export class ITunesClient {
  private readonly country: string;

  constructor(country = "us") {
    this.country = country;
  }

  /**
   * Menjalankan request ke iTunes Search API.
   */
  async search(term: string, limit: number): Promise<ITunesSearchResponse> {
    const params = new URLSearchParams({
      term,
      country: this.country,
      media: "music",
      entity: "song",
      limit: String(limit),
    });

    const url = `${ITUNES_API_URL}?${params}`;

    logger.debug(
      {
        provider: "itunes",
        term,
        country: this.country,
        limit,
      },
      "Searching iTunes metadata",
    );

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`iTunes API returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as ITunesSearchResponse;

      logger.debug(
        {
          provider: "itunes",
          resultCount: data.resultCount,
        },
        "iTunes metadata search completed",
      );

      return data;
    } catch (error) {
      logger.error(
        {
          err: error,
          provider: "itunes",
          term,
        },
        "iTunes metadata search failed",
      );

      throw error;
    }
  }
}
