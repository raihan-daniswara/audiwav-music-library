export interface ArtistCreditArtist {
  mbid?: string;
  name?: string;
  position?: number;
}

export interface ArtistCredit {
  display?: string;
  artists?: ArtistCreditArtist[];
}

export interface SearchResultItem {
  mbid?: string;
  recordingMbid?: string;
  id?: string;
  title?: string;
  artist?: string;
  album?: string;
  name?: string;
  artworkUrl?: string;
  durationMs?: number;
  artist_credit?: ArtistCredit;
}
