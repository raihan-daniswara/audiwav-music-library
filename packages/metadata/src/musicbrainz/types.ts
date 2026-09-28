// ============================================================
// Shared / Common Types
// ============================================================

export interface MusicTag {
  id: number;
  name: string;
  count: number;
}

export interface MusicAlias {
  name: string;
  locale: string | null;
  sortName: string;
  primaryForLocale: boolean;
}

export interface Area {
  mbid: string;
  name: string;
}

export interface Artwork {
  url: string;
}

// ============================================================
// Track
// ============================================================

export interface TrackDetail {
  mbid: string;
  title: string;
  durationMs: number | null;
  rating: number | null;
  ratingCount: number | null;
  isrc: string[];
  aliases: MusicAlias[];
  tags: MusicTag[];
  annotation: string | null;
}

// ============================================================
// Artist
// ============================================================

export interface TrackArtist {
  mbid: string;
  name: string;
  sortName: string | null;
  creditName: string;
  joinPhrase: string | null;
  position: number;
  type: string | null;
  area: Area | null;
  rating: number | null;
  ratingCount: number | null;
  aliases: MusicAlias[];
  tags: MusicTag[];
  annotation: string | null;
  artwork?: Artwork; // Di-inject oleh Wikidata pasca-query
}

// ============================================================
// Album / Release Group
// ============================================================

export interface TrackAlbum {
  mbid: string;
  name: string;
  type: string | null;
  firstReleaseDate: string | null;
  rating: number | null;
  ratingCount: number | null;
  aliases: MusicAlias[];
  tags: MusicTag[];
  annotation: string | null;
  artwork: Artwork;
}

// ============================================================
// Local Audio File
// ============================================================

export interface LocalAudio {
  available: boolean;
  format: string | null;
  codec: string | null;
  bitrate: number | null;
  bitDepth: number | null;
  sampleRate: number | null;
  channels: number | null;
  sizeBytes: number | null;
}

// ============================================================
// Complete Track Detail Response
// ============================================================

export interface TrackDetailResponse {
  track: TrackDetail;
  artists: TrackArtist[];
  album: TrackAlbum | null;
  local: LocalAudio;
}
