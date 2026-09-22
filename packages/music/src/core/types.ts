export type AudioQuality = "lossless" | "high" | "normal";

export type AudioStatus = "ready" | "downloading";

export interface AudioMetadataTags {
  title: string;
  artist: string;
  album?: string;
  releaseYear?: number;
  releaseDate?: string;
  genre?: string;
  trackNumber?: number;
  trackCount?: number;
  discNumber?: number;
  discCount?: number;
  recordingMbid?: string;
  artworkUrl?: string;
}

export interface AudioQuery extends AudioMetadataTags {
  duration?: number;
  durationMs?: number;
  quality?: AudioQuality;
}

export interface AudioResult {
  /** Nama Provider (contoh: 'slskd', 'jiosaavn', 'youtube') */
  provider: string;
  
  /** 
   * 'ready': URL langsung bisa di-stream oleh Frontend
   * 'downloading': Sedang diunduh di background oleh slskd (belum bisa di-stream sekarang)
   */
  status: AudioStatus;
  
  /** Kualitas Audio utama */
  quality: AudioQuality;
  
  /** Format Audio utama (flac, mp3, m4a, opus) */
  format: string;
  
  /** URL Stream langsung (tersedia jika status 'ready') */
  url?: string;

  /**
   * Jika provider utama (lossless/slskd) mengembalikan 'downloading',
   * maka properti ini akan diisi dengan provider fallback
   * sehingga user tetap bisa menstreaming audio sementara
   * versi Lossless sedang didownload di latar belakang.
   */
  fallback?: {
    provider: string;
    quality: AudioQuality;
    format: string;
    url: string;
  };
}

export interface AudioProvider {
  readonly name: string;
  
  /**
   * Mencari atau memesan URL Stream/File audio.
   */
  find(query: AudioQuery): Promise<AudioResult | null>;
}
