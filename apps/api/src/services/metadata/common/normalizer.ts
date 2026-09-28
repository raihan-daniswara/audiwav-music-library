import type { ITunesSearchResult, OpenSearchTrackResult } from "@audiwav/metadata";
import type { NormalizedMetadata } from "./types";

function normalizeArtworkUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/\/(\d+)x(\d+)bb\./, "/600x600bb.");
}

export function normalizeOpenSearchTrack(result: OpenSearchTrackResult): NormalizedMetadata {
  const artworkUrl = result.artworkUrl || result.album?.artwork_url || undefined;
  const albumName = result.album?.name || result.albumName || "";

  return {
    title: result.title,
    artist: result.artistName,
    album: albumName,
    
    score: result.score,
    rating: result.rating,
    ratingCount: result.ratingCount,

    album_info: result.album,
    artist_credit: result.artist_credit,
    recordingMbid: result.mbid,
    durationMs: result.durationMs,
    artworkUrl: artworkUrl || undefined,

    // == FIELDS BARU (FULL RECORD OS) ==
    tags: result.tags || [],
    isrc: result.isrc || [],
    aliases: (result.aliases || []).map((a: any) => typeof a === 'string' ? a : a.name),

    sources: ["opensearch"],
  };
}

export function normalizeITunes(result: ITunesSearchResult): NormalizedMetadata {
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
