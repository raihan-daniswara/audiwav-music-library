import { logger } from "@audiwav/logger";
import { parseLrc } from "../core/parser";
import type { LyricProvider, LyricQuery, LyricResult } from "../core/types";

interface NetEaseSearchResponse {
  result?: {
    songs?: Array<{
      id: number;
    }>;
  };
  code: number;
}

interface NetEaseLyricResponse {
  lrc?: {
    lyric: string;
  };
  tlyric?: {
    lyric: string;
  };
  uncollected?: boolean;
  nolyric?: boolean;
  code: number;
}

/**
 * NetEase Provider mengambil lirik (khususnya synced lyrics)
 * dari API Publik NetEase Music 163.
 */
export class NetEaseProvider implements LyricProvider {
  readonly name = "netease";

  async find(query: LyricQuery): Promise<LyricResult | null> {
    try {
      // 1. Search untuk mendapatkan Track ID dari NetEase
      const searchQuery = encodeURIComponent(`${query.artist} ${query.title}`);
      const searchUrl = `http://music.163.com/api/search/get/web?s=${searchQuery}&type=1&offset=0&limit=3`;

      const searchRes = await fetch(searchUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (!searchRes.ok) {
        logger.debug({ status: searchRes.status }, "NetEase search request failed");
        return null;
      }

      const searchData = (await searchRes.json()) as NetEaseSearchResponse;
      const trackId = searchData?.result?.songs?.[0]?.id;

      if (!trackId) {
        logger.debug("NetEase search returned no matching track ID");
        return null;
      }

      logger.debug({ trackId }, "Found NetEase track ID");

      // 2. Fetch Lirik berdasarkan Track ID
      const lyricUrl = `http://music.163.com/api/song/lyric?id=${trackId}&lv=1&kv=1&tv=-1`;
      const lyricRes = await fetch(lyricUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (!lyricRes.ok) {
         logger.debug({ status: lyricRes.status }, "NetEase lyric fetch failed");
         return null;
      }

      const lyricData = (await lyricRes.json()) as NetEaseLyricResponse;

      // Jika lagu hanya musik instrumental
      if (lyricData.uncollected || lyricData.nolyric) {
        return {
          provider: this.name,
          syncType: "none",
          instrumental: true,
          lines: [],
        };
      }

      const rawLrc = lyricData.lrc?.lyric;

      if (rawLrc && rawLrc.trim().length > 0) {
        return {
          provider: this.name,
          syncType: "line",
          instrumental: false,
          lines: parseLrc(rawLrc),
          plainLyrics: rawLrc, // NetEase lrc text bisa disisihkan sebagai plain juga
        };
      }

      return null;
    } catch (error) {
      logger.error({ err: error, provider: this.name }, "NetEase fetch error");
      return null;
    }
  }
}
