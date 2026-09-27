import { logger } from "@audiwav/logger";
import { searchITunesByMetadata, getCoverArtForRecording } from "@audiwav/metadata";
import { normalizeITunes } from "./common/normalizer";
import { normalizeQuery } from "./common/query";
import type { NormalizedMetadata } from "./common/types";
import type { ITunesSearchOptions, ITunesSearchResult } from "@audiwav/metadata";

export interface MetadataDetailOptions {
  country?: string;
}

export class MetadataDetailService {
  async getDetail(
    candidate: NormalizedMetadata,
    options: MetadataDetailOptions = {},
  ): Promise<NormalizedMetadata> {
    let enriched: NormalizedMetadata = { ...candidate };

    // 1. UTAMA: Tarik Artwork langsung dari Database MusicBrainz kita!
    if (candidate.recordingMbid) {
      logger.debug({ recordingMbid: candidate.recordingMbid }, "Mencari Artwork cover di database lokal");
      try {
        const dbArtwork = await getCoverArtForRecording(candidate.recordingMbid);
        if (dbArtwork) {
          logger.debug({ recordingMbid: candidate.recordingMbid }, "Artwork ditemukan di Database Lokal!");
          enriched.artworkUrl = dbArtwork;
        }
      } catch (e) {
        logger.warn({ err: e, recordingMbid: candidate.recordingMbid }, "Gagal mencari artwork dari DB");
      }
    }

    // 2. Jika artwork masih tidak ketemu di DB lokal (atau meta minim), jadikan iTunes Fallback!
    try {
      const itunesResults = await searchITunesByMetadata({
        artist: candidate.artist,
        title: candidate.title,
        album: candidate.album,
        country: options.country,
        limit: 50,
      });

      const itunesMatch = selectITunesMatch(itunesResults, candidate);

      if (itunesMatch) {
         // Hanya timpa metadata yang masih kosong (Agar DB Lokal tetap jadi prioritas)
         const normalizedItunes = normalizeITunes(itunesMatch);
         enriched = mergeMetadata(enriched, normalizedItunes);
         logger.debug({ artist: candidate.artist, title: candidate.title }, "Enriched sisa data metadata menggunakan iTunes (Fallback)");
      }
    } catch (error) {
      logger.warn({ err: error, provider: "itunes", artist: candidate.artist, title: candidate.title }, "iTunes enrichment failed");
    }

    return enriched;
  }
}

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

  const exactAlbumMatch = normalizedResults.find(
    (item) => item.artist === artist && item.title === title && item.album === album,
  );
  if (exactAlbumMatch) return exactAlbumMatch.result;

  const exactTrackMatch = normalizedResults.find(
    (item) => item.artist === artist && item.title === title,
  );
  if (exactTrackMatch) return exactTrackMatch.result;

  const prefixMatch = normalizedResults.find(
    (item) => item.artist.startsWith(artist) && item.title.startsWith(title),
  );
  return prefixMatch?.result;
}

function mergeMetadata(base: NormalizedMetadata, enrichment: NormalizedMetadata): NormalizedMetadata {
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
    // Jika DB Lokal sudah punya image, TIDAK BOLEH DITIMPA OLEH ITUNES:
    artworkUrl: base.artworkUrl ?? enrichment.artworkUrl,
    sourceUrl: base.sourceUrl ?? enrichment.sourceUrl,
    sources: [...new Set([...base.sources, ...enrichment.sources])],
  };
}
