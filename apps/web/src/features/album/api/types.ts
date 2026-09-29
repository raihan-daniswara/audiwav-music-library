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
