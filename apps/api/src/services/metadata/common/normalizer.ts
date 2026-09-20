import type {
  CanonicalSearchResult,
  ITunesSearchResult,
  MusicBrainzSearchResult,
} from "@audiwav/metadata";

import type { NormalizedMetadata } from "./types";

/**
 * Mengubah artwork iTunes menjadi ukuran yang lebih besar.
 */
function normalizeArtworkUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  return url.replace(/\/\d+x\d+bb\./, "/600x600bb.");
}

/**
 * Mengubah hasil Canonical menjadi format metadata internal Audiwav.
 */
export function normalizeCanonical(
  result: CanonicalSearchResult,
): NormalizedMetadata {
  return {
    title: result.recording_name,
    artist: result.artist_credit_name,
    album: result.release_name,

    score: result.score,

    artistMbid: result.artist_mbids,
    releaseMbid: result.release_mbid,
    recordingMbid: result.recording_mbid,

    sources: ["canonical"],
  };
}

/**
 * Mengubah hasil iTunes menjadi format metadata internal Audiwav.
 */
export function normalizeITunes(
  result: ITunesSearchResult,
): NormalizedMetadata {
  const releaseDate = result.releaseDate;

  return {
    title: result.trackName,
    artist: result.artistName,
    album: result.collectionName,

    releaseDate,
    releaseYear: releaseDate ? new Date(releaseDate).getFullYear() : undefined,

    durationMs: result.trackTimeMillis,
    trackNumber: result.trackNumber,
    trackCount: result.trackCount,
    discNumber: result.discNumber,
    discCount: result.discCount,

    genre: result.primaryGenreName,
    isExplicit: result.trackExplicitness === "explicit",

    artworkUrl: normalizeArtworkUrl(result.artworkUrl100),
    sourceUrl: result.trackViewUrl,

    sources: ["itunes"],
  };
}

/**
 * Mengubah hasil MusicBrainz menjadi format metadata internal Audiwav.
 */
export function normalizeMusicBrainz(
  result: MusicBrainzSearchResult,
): NormalizedMetadata {
  return {
    title: "",
    artist: "",
    album: "",

    releaseDate: result.releaseDate,
    releaseYear: result.releaseYear,

    releaseMbid: result.releaseMbid,
    recordingMbid: result.recordingMbid,

    durationMs: result.durationMs,
    trackCount: result.trackCount,

    sources: ["musicbrainz"],
  };
}
