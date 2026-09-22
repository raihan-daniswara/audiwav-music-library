import { logger } from "@audiwav/logger";
import {
  searchITunesByMetadata,
  searchMusicBrainz,
} from "@audiwav/metadata";

import {
  normalizeITunes,
  normalizeMusicBrainz,
} from "./common/normalizer";
import { normalizeQuery } from "./common/query";
import type { NormalizedMetadata } from "./common/types";

import type {
  ITunesSearchOptions,
  ITunesSearchResult,
  MusicBrainzSearchResult,
} from "@audiwav/metadata";

/**
 * Dependency injection untuk metadata detail / enrichment.
 */
export interface MetadataDetailDependencies {
  searchITunesByMetadata?: (
    options: ITunesSearchOptions,
  ) => Promise<ITunesSearchResult[]>;

  searchMusicBrainz?: (
    recordingMbid: string,
  ) => Promise<MusicBrainzSearchResult | undefined>;
}

export interface MetadataDetailOptions {
  country?: string;
}

/**
 * Service untuk meng-enrich dan mengambil detail lengkap metadata.
 *
 * Alur enrichment:
 * 1. iTunes digunakan untuk melengkapi metadata (artwork, duration, genre, dsb).
 * 2. Jika iTunes tidak menemukan match, MusicBrainz digunakan sebagai fallback (jika recordingMbid ada).
 */
export class MetadataDetailService {
  private readonly dependencies: MetadataDetailDependencies;

  constructor(dependencies: MetadataDetailDependencies = {}) {
    this.dependencies = dependencies;
  }

  /**
   * Mengambil detail dan melengkapi metadata kandidat.
   */
  async getDetail(
    candidate: NormalizedMetadata,
    options: MetadataDetailOptions = {},
  ): Promise<NormalizedMetadata> {
    const itunesSearchByMetadata =
      this.dependencies.searchITunesByMetadata ?? searchITunesByMetadata;

    const musicBrainzSearch =
      this.dependencies.searchMusicBrainz ?? searchMusicBrainz;

    let enriched: NormalizedMetadata = { ...candidate };

    // 1. Mencoba enrichment dari iTunes terlebih dahulu
    try {
      const itunesResults = await itunesSearchByMetadata({
        artist: candidate.artist,
        title: candidate.title,
        album: candidate.album,
        country: options.country,
        limit: 50,
      });

      const itunesMatch = selectITunesMatch(itunesResults, candidate);

      if (itunesMatch) {
        logger.debug(
          { artist: candidate.artist, title: candidate.title },
          "Enriched metadata using iTunes",
        );
        return mergeMetadata(enriched, normalizeITunes(itunesMatch));
      }
    } catch (error) {
      logger.warn(
        {
          err: error,
          provider: "itunes",
          artist: candidate.artist,
          title: candidate.title,
        },
        "iTunes enrichment failed",
      );
    }

    // 2. Fallback ke MusicBrainz jika iTunes match tidak ditemukan dan recordingMbid ada
    if (candidate.recordingMbid) {
      try {
        const musicBrainzResult = await musicBrainzSearch(
          candidate.recordingMbid,
        );

        if (musicBrainzResult) {
          logger.debug(
            { recordingMbid: candidate.recordingMbid },
            "Enriched metadata using MusicBrainz fallback",
          );
          return mergeMetadata(
            enriched,
            normalizeMusicBrainz(musicBrainzResult),
          );
        }
      } catch (error) {
        logger.warn(
          {
            err: error,
            provider: "musicbrainz",
            recordingMbid: candidate.recordingMbid,
          },
          "MusicBrainz enrichment failed",
        );
      }
    }

    return enriched;
  }
}

/**
 * Memilih hasil iTunes yang paling sesuai dengan candidate.
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
 * Menggabungkan base metadata dengan hasil enrichment.
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
