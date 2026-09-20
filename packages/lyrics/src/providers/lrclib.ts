import { parseLrc } from "../parser"
import type {
  LyricProvider,
  LyricQuery,
  LyricResult,
} from "../types"

interface LrcLibResponse {
  id: number
  name: string
  trackName: string
  artistName: string
  albumName: string
  duration: number
  instrumental: boolean
  plainLyrics: string | null
  syncedLyrics: string | null
}

export interface LrcLibOptions {
  baseUrl?: string
  timeoutMs?: number
}

export class LrcLibProvider implements LyricProvider {
  readonly name = "lrclib"

  private readonly baseUrl: string
  private readonly timeoutMs: number

  constructor(options: LrcLibOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://lrclib.net"
    this.timeoutMs = options.timeoutMs ?? 10_000
  }

  async find(query: LyricQuery): Promise<LyricResult | null> {
    const url = new URL("/api/get", this.baseUrl)

    url.searchParams.set("track_name", query.title)
    url.searchParams.set("artist_name", query.artist)

    if (query.album) {
      url.searchParams.set("album_name", query.album)
    }

    if (query.duration !== undefined) {
      url.searchParams.set(
        "duration",
        String(Math.round(query.duration)),
      )
    }

    const response = await fetchWithTimeout(
      url,
      this.timeoutMs,
    )

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error(
        `LRCLIB request failed: ${response.status} ${response.statusText}`,
      )
    }

    const data = (await response.json()) as LrcLibResponse

    if (data.instrumental) {
      return {
        provider: this.name,
        syncType: "none",
        instrumental: true,
        lines: [],
        plainLyrics: data.plainLyrics ?? undefined,
      }
    }

    if (data.syncedLyrics) {
      return {
        provider: this.name,
        syncType: "line",
        instrumental: false,
        lines: parseLrc(data.syncedLyrics),
        plainLyrics: data.plainLyrics ?? undefined,
      }
    }

    if (data.plainLyrics) {
      return {
        provider: this.name,
        syncType: "none",
        instrumental: false,
        lines: data.plainLyrics
          .split(/\r?\n/)
          .filter(Boolean)
          .map((text) => ({
            text,
            startMs: 0,
          })),
        plainLyrics: data.plainLyrics,
      }
    }

    return null
  }
}

async function fetchWithTimeout(
  url: URL,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Audiwav/1.0",
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}
