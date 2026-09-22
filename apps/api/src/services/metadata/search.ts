import { logger } from "@audiwav/logger";
import { ITunesClient, searchCanonical } from "@audiwav/metadata";

import { normalizeCanonical, normalizeITunes } from "./common/normalizer";
import { normalizeQuery, parseMetadataQuery } from "./common/query";
import type {
  MetadataSearchOptions,
  MetadataSearchResult,
  NormalizedMetadata,
} from "./common/types";

import type {
  CanonicalClient,
  CanonicalSearchOptions,
  CanonicalSearchResult,
} from "@audiwav/metadata";

/**
 * Dependency injection untuk provider metadata search.
 */
export interface MetadataSearchDependencies {
  canonical?: CanonicalClient;

  searchCanonical?: (
    client: CanonicalClient,
    options: CanonicalSearchOptions,
  ) => Promise<CanonicalSearchResult[]>;
}

/**
 * Service khusus pencarian kandidat metadata (tanpa enrichment).
 *
 * Canonical digunakan sebagai sumber utama candidate,
 * dan iTunes digunakan sebagai fallback jika Canonical tidak ada / kosong.
 */
export class MetadataSearchService {
  private readonly dependencies: MetadataSearchDependencies;

  constructor(dependencies: MetadataSearchDependencies = {}) {
    this.dependencies = dependencies;
  }

  async search(
    query: string,
    options: MetadataSearchOptions = {},
  ): Promise<MetadataSearchResult[]> {
    const parsedQuery = parseMetadataQuery(query);

    if (!parsedQuery.normalized) {
      return [];
    }

    const limit = Math.min(options.limit ?? 10, 50);

    const canonicalSearch =
      this.dependencies.searchCanonical ?? searchCanonical;

    logger.debug(
      {
        query,
        normalizedQuery: parsedQuery.normalized,
        limit,
      },
      "Starting metadata search",
    );

    let results: NormalizedMetadata[] = [];

    // Canonical digunakan sebagai sumber utama untuk menemukan candidate.
    if (this.dependencies.canonical) {
      try {
        const canonicalResults = await canonicalSearch(
          this.dependencies.canonical,
          {
            query: parsedQuery.normalized,
            limit,
          },
        );

        results = canonicalResults.map(normalizeCanonical);
      } catch (error) {
        logger.error(
          {
            err: error,
            provider: "canonical",
            query: parsedQuery.normalized,
          },
          "Canonical metadata search failed",
        );
      }
    }

    // Jika Canonical tidak tersedia atau tidak menghasilkan candidate,
    // gunakan iTunes sebagai fallback free-text search.
    if (results.length === 0) {
      try {
        const itunesClient = new ITunesClient(options.country ?? "us");

        const response = await itunesClient.search(
          parsedQuery.normalized,
          limit,
        );

        results = response.results.map(normalizeITunes);
      } catch (error) {
        logger.error(
          {
            err: error,
            provider: "itunes",
            query: parsedQuery.normalized,
          },
          "iTunes fallback search failed",
        );
      }
    }

    const deduplicatedResults = deduplicateResults(results);

    logger.debug(
      {
        query,
        resultCount: deduplicatedResults.length,
      },
      "Metadata search completed",
    );

    return deduplicatedResults.slice(0, limit);
  }
}

/**
 * Menghapus hasil yang menunjuk ke lagu yang sama.
 */
function deduplicateResults(
  results: NormalizedMetadata[],
): NormalizedMetadata[] {
  const seen = new Set<string>();
  const unique: NormalizedMetadata[] = [];

  for (const result of results) {
    const key = result.recordingMbid
      ? `mbid:${result.recordingMbid}`
      : [
          normalizeQuery(result.artist),
          normalizeQuery(result.title),
          normalizeQuery(result.album),
        ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(result);
  }

  return unique;
}
