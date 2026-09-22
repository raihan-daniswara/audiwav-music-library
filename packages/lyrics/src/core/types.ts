export interface LyricQuery {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
}

export interface LyricWord {
  text: string;
  startMs: number;
  endMs?: number;
}

export interface LyricLine {
  text: string;
  startMs: number;
  endMs?: number;
  words?: LyricWord[];
}

export type LyricSyncType = "none" | "line" | "word";

export interface LyricResult {
  provider: string;
  syncType: LyricSyncType;
  instrumental: boolean;
  lines: LyricLine[];
  plainLyrics?: string;
}

export interface LyricProvider {
  readonly name: string;

  find(query: LyricQuery): Promise<LyricResult | null>;
}
