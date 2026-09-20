import { logger } from "@audiwav/logger";
import {
  ITunesClient,
  searchCanonical,
  searchITunesByMetadata,
  searchMusicBrainz,
} from "@audiwav/metadata";

import {
  normalizeCanonical,
  normalizeITunes,
  normalizeMusicBrainz,
} from "../common/normalizer";
import { normalizeQuery, parseMetadataQuery } from "../common/query";
import type {
  MetadataSearchOptions,
  MetadataSearchResult,
  NormalizedMetadata,
} from "../common/types";

import type {
  CanonicalClient,
  CanonicalSearchOptions,
  CanonicalSearchResult,
  ITunesSearchOptions,
  ITunesSearchResult,
  MusicBrainzSearchResult,
} from "@audiwav/metadata";

/**
 * Dependency injection untuk provider metadata.
 *
 * Default provider digunakan jika dependency tidak di-inject.
 * Ini juga memudahkan unit test tanpa harus memanggil provider asli.
 */
export interface MetadataSearchServiceDependencies {
  canonical?: CanonicalClient;

  searchCanonical?: (
    client: CanonicalClient,
    options: CanonicalSearchOptions,
  ) => Promise<CanonicalSearchResult[]>;

  searchITunesByMetadata?: (
    options: ITunesSearchOptions,
  ) => Promise<ITunesSearchResult[]>;

  searchMusicBrainz?: (
    recordingMbid: string,
  ) => Promise<MusicBrainzSearchResult | undefined>;
}

/**
 * Service untuk melakukan pencarian dan enrichment metadata.
 *
 * Canonical menjadi sumber utama candidate,
 * iTunes menjadi sumber enrichment,
 * dan MusicBrainz menjadi fallback enrichment.
 */
export class MetadataSearchService {
  private readonly dependencies: MetadataSearchServiceDependencies;

  constructor(dependencies: MetadataSearchServiceDependencies = {}) {
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

    const itunesSearchByMetadata =
      this.dependencies.searchITunesByMetadata ?? searchITunesByMetadata;

    const musicBrainzSearch =
      this.dependencies.searchMusicBrainz ?? searchMusicBrainz;

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

        for (const canonicalResult of canonicalResults) {
          const normalized = normalizeCanonical(canonicalResult);

          // iTunes digunakan untuk melengkapi metadata candidate Canonical.
          try {
            const itunesResults = await itunesSearchByMetadata({
              artist: normalized.artist,
              title: normalized.title,
              album: normalized.album,
              country: options.country,
              limit: 50,
            });

            const itunesMatch = selectITunesMatch(itunesResults, normalized);

            if (itunesMatch) {
              results.push(
                mergeMetadata(normalized, normalizeITunes(itunesMatch)),
              );

              continue;
            }

            // MusicBrainz digunakan sebagai fallback enrichment
            // berdasarkan Recording MBID dari Canonical.
            if (normalized.recordingMbid) {
              const musicBrainzResult = await musicBrainzSearch(
                normalized.recordingMbid,
              );

              if (musicBrainzResult) {
                results.push(
                  mergeMetadata(
                    normalized,
                    normalizeMusicBrainz(musicBrainzResult),
                  ),
                );

                continue;
              }
            }
          } catch (error) {
            logger.warn(
              {
                err: error,
                provider: "metadata",
                artist: normalized.artist,
                title: normalized.title,
                recordingMbid: normalized.recordingMbid,
              },
              "Metadata enrichment failed",
            );
          }

          // Jika enrichment gagal, candidate Canonical
          // tetap dikembalikan sebagai hasil.
          results.push(normalized);
        }
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
 * Memilih hasil iTunes yang paling sesuai dengan candidate Canonical.
 *
 * Prioritas:
 * 1. artist + title + album
 * 2. artist + title
 * 3. prefix artist + title
 */
function selectITunesMatch(
  results: ITunesSearchResult[],
  candidate: NormalizedMetadata,
): ITunesSearchResult | undefined {
  const artist = normalizeQuery(candidate.artist);
  const title = normalizeQuery(candidate.title);
  const album = normalizeQuery(candidate.album);

  const normalizedResults = results.map((result) => ({
    result,
    artist: normalizeQuery(result.artistName),
    title: normalizeQuery(result.trackName),
    album: normalizeQuery(result.collectionName),
  }));

  // Exact artist + title + album.
  const exactAlbumMatch = normalizedResults.find(
    (item) =>
      item.artist === artist && item.title === title && item.album === album,
  );

  if (exactAlbumMatch) {
    return exactAlbumMatch.result;
  }

  // Exact artist + title.
  const exactTrackMatch = normalizedResults.find(
    (item) => item.artist === artist && item.title === title,
  );

  if (exactTrackMatch) {
    return exactTrackMatch.result;
  }

  // Prefix artist + title sebagai fallback.
  const prefixMatch = normalizedResults.find(
    (item) => item.artist.startsWith(artist) && item.title.startsWith(title),
  );

  return prefixMatch?.result;
}

/**
 * Menggabungkan metadata Canonical dengan metadata provider lain.
 *
 * Canonical tetap menjadi sumber identity utama.
 * Provider lain hanya mengisi field yang belum tersedia.
 */
function mergeMetadata(
  base: NormalizedMetadata,
  enrichment: NormalizedMetadata,
): NormalizedMetadata {
  return {
    ...base,

    releaseDate: base.releaseDate ?? enrichment.releaseDate,

    releaseYear: base.releaseYear ?? enrichment.releaseYear,

    genre: base.genre ?? enrichment.genre,

    durationMs: base.durationMs ?? enrichment.durationMs,

    trackNumber: base.trackNumber ?? enrichment.trackNumber,

    trackCount: base.trackCount ?? enrichment.trackCount,

    discNumber: base.discNumber ?? enrichment.discNumber,

    discCount: base.discCount ?? enrichment.discCount,

    isExplicit: base.isExplicit ?? enrichment.isExplicit,

    artworkUrl: base.artworkUrl ?? enrichment.artworkUrl,

    sourceUrl: base.sourceUrl ?? enrichment.sourceUrl,

    sources: [...new Set([...base.sources, ...enrichment.sources])],
  };
}

/**
 * Menghapus hasil yang menunjuk ke lagu yang sama.
 *
 * Recording MBID menjadi identifier utama.
 * Jika MBID tidak tersedia, gunakan kombinasi artist + title + album.
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
