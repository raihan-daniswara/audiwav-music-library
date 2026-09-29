export interface ArtistCreditArtist {
  mbid: string;
  name: string;
  position: number;
}

export interface ArtistCredit {
  display: string;
  artists: ArtistCreditArtist[];
}

export interface AliasItem {
  name: string;
}

export interface TagItem {
  id: number;
  name: string;
}

export interface TrackAlbumInfo {
  name: string;
  release_group_mbid?: string;
  artwork_url?: string;
}

export interface OpenSearchTrackResult {
  mbid: string;
  title: string;
  durationMs: number;
  duration_ms: number | null;
  artistName: string;
  artist_credit: ArtistCredit;
  album?: TrackAlbumInfo;
  albumName?: string;
  aliases: AliasItem[];
  isrc: string[];
  tags: TagItem[];
  rating: number;
  ratingCount: number;
  rating_count: number;
  score: number;
  artworkUrl?: string;
}

export interface OpenSearchArtistResult {
  artworkUrl?: string;
  mbid: string;
  name: string;
  sort_name: string;
  aliases: AliasItem[];
  tags: TagItem[];
  rating: number;
  ratingCount: number;
  rating_count: number;
  score: number;
}

export interface OpenSearchAlbumResult {
  mbid: string;
  title: string;
  name: string;
  artistName: string;
  artist_credit: ArtistCredit;
  type: string | null;
  aliases: AliasItem[];
  tags: TagItem[];
  rating: number;
  ratingCount: number;
  rating_count: number;
  score: number;
  artworkUrl?: string;
}
