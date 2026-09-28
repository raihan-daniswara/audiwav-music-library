import { logger } from "@audiwav/logger";
import { ITunesClient, searchTracks, searchArtists, searchAlbums } from "@audiwav/metadata";
import { normalizeOpenSearchTrack, normalizeITunes } from "./common/normalizer";
import { normalizeQuery, parseMetadataQuery } from "./common/query";
import type { MetadataSearchOptions, MetadataSearchResult, NormalizedMetadata } from "./common/types";
import { getArtistImageFromWiki } from "./wikimedia/query";

export class MetadataSearchService {
  async search(query: string, options: MetadataSearchOptions = {}): Promise<MetadataSearchResult[]> {
    const parsedQuery = parseMetadataQuery(query);
    if (!parsedQuery.normalized) return [];

    const limit = Math.min(options.limit ?? 10, 50);
    let results: NormalizedMetadata[] = [];

    logger.debug({ query, normalizedQuery: parsedQuery.normalized, limit }, "Starting metadata search");

    // Primary Source: OpenSearch (Database Lokal)
    try {
      const osResults = await searchTracks(parsedQuery.normalized, limit);
      results = osResults.map(normalizeOpenSearchTrack);
    } catch (error) {
      logger.error({ err: error, provider: "opensearch", query: parsedQuery.normalized }, "OpenSearch lookup failed");
    }

    // Fallback: iTunes
    if (results.length === 0) {
      try {
        const itunesClient = new ITunesClient(options.country ?? "us");
        const response = await itunesClient.search(parsedQuery.normalized, limit);
        results = response.results.map(normalizeITunes);
      } catch (error) {
        logger.error({ err: error, provider: "itunes", query: parsedQuery.normalized }, "iTunes fallback failed");
      }
    }

    const deduplicatedResults = deduplicateResults(results);
    logger.debug({ query, resultCount: deduplicatedResults.length }, "Metadata search completed");
    return deduplicatedResults.slice(0, limit);
  }

  // ==== METHOD BARU: Pencarian Spesifik ====
  async searchArtistsRaw(query: string, limit: number = 10) {
    const osArtists = await searchArtists(query, limit);
    
    // Enrich with Wikimedia images in parallel
    const enrichedArtists = await Promise.all(
      osArtists.map(async (artist) => {
        const artworkUrl = await getArtistImageFromWiki(artist.mbid);
        return {
          ...artist,
          artworkUrl
        };
      })
    );

    return enrichedArtists;
  }

  async searchAlbumsRaw(query: string, limit: number = 10) {
    return await searchAlbums(query, limit);
  }
}

function deduplicateResults(results: NormalizedMetadata[]): NormalizedMetadata[] {
  const seen = new Set<string>();
  const unique: NormalizedMetadata[] = [];
  for (const result of results) {
    const key = result.recordingMbid
      ? `mbid:${result.recordingMbid}`
      : [normalizeQuery(result.artist), normalizeQuery(result.title), normalizeQuery(result.album)].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(result);
  }
  return unique;
}
