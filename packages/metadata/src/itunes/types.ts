/**
 * Satu hasil lagu dari iTunes Search API.
 *
 * Hanya field yang dibutuhkan Audiwav yang kita definisikan.
 */
export interface ITunesSearchResult {
  artistId: number;
  collectionId: number;
  trackId: number;

  artistName: string;
  collectionName: string;
  trackName: string;

  collectionArtistName?: string;

  artistViewUrl: string;
  collectionViewUrl: string;
  trackViewUrl: string;

  previewUrl?: string;

  artworkUrl30?: string;
  artworkUrl60?: string;
  artworkUrl100?: string;

  releaseDate?: string;

  // Informasi explicitness dari iTunes.
  collectionExplicitness?: string;
  trackExplicitness?: string;

  trackTimeMillis?: number;

  discNumber?: number;
  trackNumber?: number;
  trackCount?: number;
  discCount?: number;

  country: string;
  primaryGenreName?: string;
  isStreamable?: boolean;
}

/**
 * Response dari iTunes Search API.
 */
export interface ITunesSearchResponse {
  resultCount: number;
  results: ITunesSearchResult[];
}

/**
 * Parameter pencarian lagu di iTunes.
 *
 * Artist, title, dan album digunakan untuk membentuk
 * satu search term pada iTunes Search API.
 */
export interface ITunesSearchOptions {
  artist: string;
  title: string;
  album: string;
  country?: string;
  limit?: number;
}
