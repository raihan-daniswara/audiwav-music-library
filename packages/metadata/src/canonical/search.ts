import { logger } from "@audiwav/logger";

import type {
  CanonicalClient,
  CanonicalSearchOptions,
  CanonicalSearchResult,
} from "./types";
import { sortCanonicalResults } from "./weighting";

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
  const rawQuery = options.query.trim();
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
    // Ambil candidate secukupnya dari Postgres menggunakan Index (B-Tree/GIN)
    // agar query PostgreSQL tetap berkecepatan tinggi (<10ms).
    const fetchLimit = Math.min(limit * 3, 50);

    // 1. Exact lookup menggunakan B-tree index pada combined_lookup.
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
      LIMIT ${fetchLimit}
    `;

    if (exactResults.length > 0) {
      // Lakukan re-sorting di memori Bun/JS (sangat cepat ~0.1ms):
      // Judul sama -> score terkecil. Judul beda -> weighted score.
      const sortedExact = sortCanonicalResults(exactResults, rawQuery, lookup);

      logger.debug(
        {
          provider: "canonical",
          query: options.query,
          resultCount: sortedExact.length,
          matchType: "exact",
        },
        "Canonical exact search completed",
      );

      return sortedExact.slice(0, limit);
    }

    // 2. Fuzzy lookup menggunakan GIN trigram index pada combined_lookup.
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
      LIMIT ${fetchLimit}
    `;

    // Re-sorting di memori Bun/JS.
    const sortedFuzzy = sortCanonicalResults(fuzzyResults, rawQuery, lookup);

    logger.debug(
      {
        provider: "canonical",
        query: options.query,
        resultCount: sortedFuzzy.length,
        matchType: "fuzzy",
      },
      "Canonical fuzzy search completed",
    );

    return sortedFuzzy.slice(0, limit);
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
