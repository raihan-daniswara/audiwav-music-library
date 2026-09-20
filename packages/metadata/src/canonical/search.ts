import { logger } from "@audiwav/logger";

import type {
  CanonicalClient,
  CanonicalSearchOptions,
  CanonicalSearchResult,
} from "./types";

function normalizeLookup(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export async function searchCanonical(
  client: CanonicalClient,
  options: CanonicalSearchOptions,
): Promise<CanonicalSearchResult[]> {
  const lookup = normalizeLookup(options.query);
  const limit = Math.min(options.limit ?? 10, 50);

  if (!lookup) {
    return [];
  }

  logger.debug(
    {
      provider: "canonical",
      query: options.query,
      lookup,
      limit,
    },
    "Searching Canonical metadata",
  );

  try {
    // Exact lookup menggunakan B-tree index.
    const exactResults = await client<CanonicalSearchResult[]>`
      SELECT
        id,
        artist_credit_id,
        artist_mbids,
        artist_credit_name,
        release_mbid,
        release_name,
        recording_mbid,
        recording_name,
        combined_lookup,
        score
      FROM public.canonical_musicbrainz_data
      WHERE combined_lookup = ${lookup}
      ORDER BY score ASC
      LIMIT ${limit}
    `;

    if (exactResults.length > 0) {
      logger.debug(
        {
          provider: "canonical",
          query: options.query,
          resultCount: exactResults.length,
          matchType: "exact",
        },
        "Canonical exact search completed",
      );

      return exactResults;
    }

    // Fuzzy lookup menggunakan GIN trigram index.
    // Threshold rendah digunakan agar typo/reversed query tetap
    // dapat masuk sebagai candidate untuk ranking berikutnya.
    await client`
      SELECT set_limit(0.3)
    `;

    const fuzzyResults = await client<CanonicalSearchResult[]>`
      SELECT
        id,
        artist_credit_id,
        artist_mbids,
        artist_credit_name,
        release_mbid,
        release_name,
        recording_mbid,
        recording_name,
        combined_lookup,
        score
      FROM public.canonical_musicbrainz_data
      WHERE combined_lookup % ${lookup}
      ORDER BY score ASC
      LIMIT ${limit}
    `;

    logger.debug(
      {
        provider: "canonical",
        query: options.query,
        resultCount: fuzzyResults.length,
        matchType: "fuzzy",
      },
      "Canonical fuzzy search completed",
    );

    return fuzzyResults;
  } catch (error) {
    logger.error(
      {
        err: error,
        provider: "canonical",
        query: options.query,
      },
      "Canonical metadata search failed",
    );

    throw error;
  }
}
