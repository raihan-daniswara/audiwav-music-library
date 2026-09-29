export type MetadataSource = "opensearch" | "itunes";

export interface ArtistCreditArtist {
  mbid: string;
  name: string;
  position: number;
}

export interface ArtistCredit {
  display: string;
  artists: ArtistCreditArtist[];
}

export interface TrackAlbumInfo {
  name: string;
  release_group_mbid?: string;
  artwork_url?: string;
}

export interface NormalizedMetadata {
  title: string;
  artist: string;
  album: string;

  score?: number;
  rating?: number;
  ratingCount?: number;

  releaseDate?: string;
  releaseYear?: number;
  genre?: string;

  artistMbid?: string;
  releaseMbid?: string;
  recordingMbid?: string;
  album_info?: TrackAlbumInfo;
  artist_credit?: ArtistCredit;

  durationMs?: number;
  trackNumber?: number;
  trackCount?: number;
  discNumber?: number;
  discCount?: number;

  isExplicit?: boolean;
  artistArtworkUrl?: string;
  artworkUrl?: string;
  sourceUrl?: string;

  tags?: {id: number, name: string}[];
  isrc?: string[];
  aliases?: string[];
  sources: MetadataSource[];
}

export type MetadataSearchResult = NormalizedMetadata;

export interface MetadataSearchOptions {
  limit?: number;
  type?: "track" | "artist" | "album";
  country?: string;
}
