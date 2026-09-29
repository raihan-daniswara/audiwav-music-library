export interface TrackDetailResponse {
  track: {
    mbid: string;
    title: string;
    durationMs: number | null;
    rating: number | null;
    ratingCount: number | null;
    isrc: string[];
    aliases: any[];
    tags: Array<{ id: number; name: string; count: number }>;
    annotation: string | null;
  };
  artists: Array<{
    mbid: string;
    name: string;
    sortName: string;
    creditName: string;
    joinPhrase: string;
    position: number;
    type: string | null;
    area: { mbid: string; name: string } | null;
    rating: number | null;
    ratingCount: number | null;
    aliases: any[];
    tags: Array<{ id: number; name: string; count: number }>;
    annotation: string | null;
  }>;
  album: {
    mbid: string;
    name: string;
    type: string | null;
    firstReleaseDate: string | null;
    rating: number | null;
    ratingCount: number | null;
    aliases: any[];
    tags: Array<{ id: number; name: string; count: number }>;
    annotation: string | null;
    artwork: { url: string } | null;
  } | null;
  local: {
    available: boolean;
    format: string | null;
    codec: string | null;
    bitrate: number | null;
    bitDepth: number | null;
    sampleRate: number | null;
    channels: number | null;
    sizeBytes: number | null;
  };
}

export interface AlbumDetailResponse {
  album: {
    mbid: string;
    name: string;
    type: string | null;
    firstReleaseDate: string | null;
    rating: number | null;
    ratingCount: number | null;
    aliases: any[];
    tags: Array<{ id: number; name: string; count: number }>;
    annotation: string | null;
    artwork: { url: string } | null;
  };
  artists: Array<{
    mbid: string;
    name: string;
    sortName: string;
    creditName: string;
    joinPhrase: string;
    position: number;
    type: string | null;
    area: { mbid: string; name: string } | null;
    rating: number | null;
    ratingCount: number | null;
    aliases: any[];
    tags: Array<{ id: number; name: string; count: number }>;
    annotation: string | null;
  }>;
  tracks: Array<{
    position: number;
    number: string;
    title: string;
    durationMs: number | null;
    recordingMbid: string;
    artists: Array<{
       name: string;
       mbid: string;
       joinPhrase: string;
    }>;
  }>;
}

export interface ArtistDetailResponse {
  artist: {
    mbid: string;
    name: string;
    sortName: string;
    type: string | null;
    gender: string | null;
    beginDate: string | null;
    endDate: string | null;
    area: { mbid: string; name: string } | null;
    rating: number | null;
    ratingCount: number | null;
    tags: Array<{ id: number; name: string; count: number }>;
    annotation: string | null;
    urls: Array<{ type: string; url: string }>;
  };
  topTracks: Array<{
    title: string;
    durationMs: number | null;
    recordingMbid: string;
    albumName: string;
    albumMbid: string;
    artists: Array<{ name: string; mbid: string; joinPhrase: string }>;
  }>;
  releaseGroups: Array<{
    mbid: string;
    name: string;
    type: string | null;
    firstReleaseDate: string | null;
    artworkUrl: string;
  }>;
}
