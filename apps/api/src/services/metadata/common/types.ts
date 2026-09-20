/**
 * Provider yang dapat memberikan metadata untuk sebuah lagu.
 */
export type MetadataSource = "canonical" | "musicbrainz" | "itunes";

/**
 * Format metadata lagu yang sudah dinormalisasi oleh Audiwav.
 *
 * Setiap provider akan diubah ke format ini agar hasilnya
 * dapat diproses oleh search engine dengan cara yang sama.
 */
export interface NormalizedMetadata {
  // Identitas utama lagu.
  title: string;
  artist: string;
  album: string;

  // Score dari dataset Canonical.
  // Tidak tersedia jika metadata hanya berasal dari iTunes.
  score?: number;

  // Informasi release.
  releaseDate?: string;
  releaseYear?: number;
  genre?: string;

  // MusicBrainz identifiers dari Canonical.
  artistMbid?: string;
  releaseMbid?: string;
  recordingMbid?: string;

  // Informasi track.
  durationMs?: number;
  trackNumber?: number;
  trackCount?: number;
  discNumber?: number;
  discCount?: number;

  // Informasi explicit content.
  isExplicit?: boolean;

  // Artwork dan halaman sumber.
  artworkUrl?: string;
  sourceUrl?: string;

  // Provider yang memberikan metadata ini.
  sources: MetadataSource[];
}

/**
 * Hasil metadata dari search engine.
 *
 * Score di sini adalah score dari Canonical,
 * bukan relevance score hasil perhitungan aplikasi.
 */
export type MetadataSearchResult = NormalizedMetadata;

/**
 * Opsi pencarian metadata.
 */
export interface MetadataSearchOptions {
  // Jumlah hasil maksimum yang dikembalikan.
  limit?: number;

  // Country code yang digunakan oleh iTunes Search API.
  country?: string;
}
