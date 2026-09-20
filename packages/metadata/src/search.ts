import { logger } from "@audiwav/logger";

import { searchCanonical } from "./canonical/search";
import type {
  CanonicalClient,
  CanonicalSearchOptions,
  CanonicalSearchResult,
} from "./canonical/types";
import { searchITunes, searchITunesByMetadata } from "./itunes/search";
import type { ITunesSearchOptions, ITunesSearchResult } from "./itunes/types";
import { searchMusicBrainz } from "./musicbrainz/search";
import type { MusicBrainzSearchResult } from "./musicbrainz/types";
import { normalizeCanonical, normalizeITunes } from "../../../apps/api/src/services/metadata/common/normalizer";
import { normalizeQuery, parseMetadataQuery } from "../../../apps/api/src/services/metadata/common/query";
import type {
  MetadataSearchOptions,
  MetadataSearchResult,
  NormalizedMetadata,
} from "../../../apps/api/src/services/metadata/common/types";

/**
 * Dependencies provider untuk metadata search.
 *
 * Fungsi provider dibuat injectable agar search engine tetap
 * mudah diuji tanpa harus mengakses database atau API sungguhan.
 */
export interface MetadataSearchDependencies {
  canonical?: CanonicalClient;

  searchCanonical?: (
    db: CanonicalClient,
    options: CanonicalSearchOptions,
  ) => Promise<CanonicalSearchResult[]>;

  searchITunes?: (
    options: ITunesSearchOptions,
  ) => Promise<ITunesSearchResult[]>;

  searchITunesByMetadata?: (
    options: ITunesSearchOptions,
  ) => Promise<ITunesSearchResult[]>;

  searchMusicBrainz?: (
    recordingMbid: string,
  ) => Promise<MusicBrainzSearchResult | undefined>;
}

export interface MetadataSearchInput {
  query: string;
  dependencies?: MetadataSearchDependencies;
  options?: MetadataSearchOptions;
}

/**
 * Membuat identity key berdasarkan artist, title, dan album.
 *
 * Digunakan sebagai fallback ketika recording MBID tidak tersedia.
 */
function createFallbackKey(result: NormalizedMetadata): string {
  return [result.artist, result.title, result.album]
    .map((value) => normalizeQuery(value))
    .join("|");
}

/**
 * Memilih hasil iTunes yang paling sesuai dengan candidate Canonical.
 *
 * Urutan pencocokan:
 * 1. Exact artist + title + album
 * 2. Exact artist + title
 * 3. Prefix artist + title
 */
function selectITunesMatch(
  canonical: NormalizedMetadata,
  results: ITunesSearchResult[],
): ITunesSearchResult | undefined {
  const canonicalArtist = normalizeQuery(canonical.artist);
  const canonicalTitle = normalizeQuery(canonical.title);
  const canonicalAlbum = normalizeQuery(canonical.album);

  // Prioritas pertama: seluruh metadata utama sama.
  const exactMetadataMatch = results.find((result) => {
    return (
      normalizeQuery(result.artistName) === canonicalArtist &&
      normalizeQuery(result.trackName) === canonicalTitle &&
      normalizeQuery(result.collectionName) === canonicalAlbum
    );
  });

  if (exactMetadataMatch) {
    return exactMetadataMatch;
  }

  // Fallback: artist dan title sama meskipun album berbeda.
  const exactTrackMatch = results.find((result) => {
    return (
      normalizeQuery(result.artistName) === canonicalArtist &&
      normalizeQuery(result.trackName) === canonicalTitle
    );
  });

  if (exactTrackMatch) {
    return exactTrackMatch;
  }

  // Fallback terakhir: artist dan title menggunakan prefix.
  const prefixMatch = results.find((result) => {
    const artist = normalizeQuery(result.artistName);
    const title = normalizeQuery(result.trackName);

    return (
      artist.startsWith(canonicalArtist) && title.startsWith(canonicalTitle)
    );
  });

  return prefixMatch;
}

/**
 * Menggabungkan metadata Canonical dengan metadata provider.
 *
 * Canonical tetap menjadi sumber identity utama.
 */
function mergeMetadata(
  canonical: NormalizedMetadata,
  enrichment?: NormalizedMetadata,
): NormalizedMetadata {
  if (!enrichment) {
    return canonical;
  }

  return {
    ...canonical,

    // Canonical tetap menjadi sumber utama untuk identity lagu.
    title: canonical.title,
    artist: canonical.artist,
    album: canonical.album,

    // Informasi release digunakan jika Canonical tidak punya.
    releaseDate: canonical.releaseDate ?? enrichment.releaseDate,
    releaseYear: canonical.releaseYear ?? enrichment.releaseYear,
    genre: canonical.genre ?? enrichment.genre,

    // Identitas MusicBrainz tetap berasal dari Canonical.
    artistMbid: canonical.artistMbid,
    releaseMbid: canonical.releaseMbid ?? enrichment.releaseMbid,
    recordingMbid: canonical.recordingMbid,

    // Detail track.
    durationMs: canonical.durationMs ?? enrichment.durationMs,
    trackNumber: canonical.trackNumber ?? enrichment.trackNumber,
    trackCount: canonical.trackCount ?? enrichment.trackCount,
    discNumber: canonical.discNumber ?? enrichment.discNumber,
    discCount: canonical.discCount ?? enrichment.discCount,

    isExplicit: canonical.isExplicit ?? enrichment.isExplicit,

    // Artwork dan URL.
    artworkUrl: canonical.artworkUrl ?? enrichment.artworkUrl,
    sourceUrl: canonical.sourceUrl ?? enrichment.sourceUrl,

    sources: [...new Set([...canonical.sources, ...enrichment.sources])],
  };
}

/**
 * Mengubah hasil MusicBrainz menjadi metadata Audiwav.
 *
 * Identity artist/title/album tetap berasal dari Canonical,
 * sehingga MusicBrainz hanya mengisi field enrichment.
 */
function normalizeMusicBrainz(
  result: MusicBrainzSearchResult,
): NormalizedMetadata {
  return {
    title: "",
    artist: "",
    album: result.releaseName ?? "",

    releaseDate: result.releaseDate,
    releaseYear: result.releaseYear,

    releaseMbid: result.releaseMbid,
    recordingMbid: result.recordingMbid,

    durationMs: result.durationMs,
    trackCount: result.trackCount,

    sources: ["musicbrainz"],
  };
}

/**
 * Menghapus hasil metadata yang sama.
 *
 * Recording MBID menjadi identity terkuat, sedangkan artist + title +
 * album digunakan sebagai fallback untuk hasil tanpa MBID.
 */
function deduplicateResults(
  results: MetadataSearchResult[],
): MetadataSearchResult[] {
  const unique = new Map<string, MetadataSearchResult>();

  for (const result of results) {
    const fallbackKey = createFallbackKey(result);

    const mbidKey = result.recordingMbid
      ? `mbid:${result.recordingMbid}`
      : undefined;

    const existing =
      (mbidKey ? unique.get(mbidKey) : undefined) ?? unique.get(fallbackKey);

    if (!existing) {
      unique.set(fallbackKey, result);

      if (mbidKey) {
        unique.set(mbidKey, result);
      }

      continue;
    }

    existing.sources = [...new Set([...existing.sources, ...result.sources])];

    if (!existing.artistMbid && result.artistMbid) {
      existing.artistMbid = result.artistMbid;
    }

    if (!existing.releaseMbid && result.releaseMbid) {
      existing.releaseMbid = result.releaseMbid;
    }

    if (!existing.recordingMbid && result.recordingMbid) {
      existing.recordingMbid = result.recordingMbid;
    }

    if (!existing.releaseDate && result.releaseDate) {
      existing.releaseDate = result.releaseDate;
    }

    if (!existing.releaseYear && result.releaseYear) {
      existing.releaseYear = result.releaseYear;
    }

    if (!existing.genre && result.genre) {
      existing.genre = result.genre;
    }

    if (!existing.durationMs && result.durationMs) {
      existing.durationMs = result.durationMs;
    }

    if (!existing.trackNumber && result.trackNumber) {
      existing.trackNumber = result.trackNumber;
    }

    if (!existing.trackCount && result.trackCount) {
      existing.trackCount = result.trackCount;
    }

    if (!existing.discNumber && result.discNumber) {
      existing.discNumber = result.discNumber;
    }

    if (!existing.discCount && result.discCount) {
      existing.discCount = result.discCount;
    }

    if (!existing.artworkUrl && result.artworkUrl) {
      existing.artworkUrl = result.artworkUrl;
    }

    if (!existing.sourceUrl && result.sourceUrl) {
      existing.sourceUrl = result.sourceUrl;
    }

    if (existing.score === undefined && result.score !== undefined) {
      existing.score = result.score;
    }

    if (existing.recordingMbid) {
      unique.set(`mbid:${existing.recordingMbid}`, existing);
    }
  }

  return [...new Set(unique.values())];
}

/**
 * Mengambil hasil iTunes berdasarkan metadata setiap candidate Canonical.
 *
 * Setiap candidate menggunakan artist + title + album sebagai query.
 * Candidate dengan metadata yang sama hanya menghasilkan satu request.
 */
async function fetchITunesByMetadata(
  canonicalResults: CanonicalSearchResult[],
  country: string,
  searchByMetadata: (
    options: ITunesSearchOptions,
  ) => Promise<ITunesSearchResult[]>,
): Promise<Map<string, ITunesSearchResult[]>> {
  const resultsByCandidate = new Map<string, ITunesSearchResult[]>();

  for (const canonicalResult of canonicalResults) {
    const metadata = normalizeCanonical(canonicalResult);

    const candidateKey = [
      normalizeQuery(metadata.artist),
      normalizeQuery(metadata.title),
      normalizeQuery(metadata.album),
    ].join("|");

    // Candidate dengan metadata yang sama tidak perlu
    // menghasilkan request iTunes kedua kali.
    if (resultsByCandidate.has(candidateKey)) {
      continue;
    }

    try {
      const results = await searchByMetadata({
        artist: metadata.artist,
        title: metadata.title,
        album: metadata.album,
        country,
        limit: 50,
      });

      resultsByCandidate.set(candidateKey, results);

      logger.debug(
        {
          provider: "itunes",
          artist: metadata.artist,
          title: metadata.title,
          album: metadata.album,
          resultCount: results.length,
        },
        "iTunes metadata enrichment completed",
      );
    } catch (error) {
      logger.warn(
        {
          err: error,
          provider: "itunes",
          artist: metadata.artist,
          title: metadata.title,
          album: metadata.album,
        },
        "iTunes metadata search failed",
      );

      resultsByCandidate.set(candidateKey, []);
    }
  }

  return resultsByCandidate;
}

/**
 * Mengambil metadata MusicBrainz untuk candidate yang
 * tidak berhasil mendapatkan enrichment dari iTunes.
 */
async function fetchMusicBrainzFallback(
  canonicalResults: CanonicalSearchResult[],
  resultsByCandidate: Map<string, ITunesSearchResult[]>,
  searchByRecording: (
    recordingMbid: string,
  ) => Promise<MusicBrainzSearchResult | undefined>,
): Promise<Map<string, MusicBrainzSearchResult | undefined>> {
  const resultsByRecording = new Map<
    string,
    MusicBrainzSearchResult | undefined
  >();

  for (const canonicalResult of canonicalResults) {
    const metadata = normalizeCanonical(canonicalResult);

    // Jika iTunes sudah menghasilkan candidate match,
    // MusicBrainz tidak perlu dipanggil.
    const candidateKey = [
      normalizeQuery(metadata.artist),
      normalizeQuery(metadata.title),
      normalizeQuery(metadata.album),
    ].join("|");

    const itunesResults = resultsByCandidate.get(candidateKey) ?? [];

    const itunesMatch = selectITunesMatch(metadata, itunesResults);

    if (itunesMatch) {
      continue;
    }

    const recordingMbid = metadata.recordingMbid;

    if (!recordingMbid) {
      continue;
    }

    // MBID yang sama tidak perlu di-request dua kali.
    if (resultsByRecording.has(recordingMbid)) {
      continue;
    }

    try {
      const result = await searchByRecording(recordingMbid);

      resultsByRecording.set(recordingMbid, result);

      logger.debug(
        {
          provider: "musicbrainz",
          recordingMbid,
          found: Boolean(result),
        },
        "MusicBrainz fallback completed",
      );
    } catch (error) {
      logger.warn(
        {
          err: error,
          provider: "musicbrainz",
          recordingMbid,
        },
        "MusicBrainz fallback failed",
      );

      resultsByRecording.set(recordingMbid, undefined);
    }
  }

  return resultsByRecording;
}

/**
 * Mencari metadata lagu menggunakan pipeline:
 *
 * Canonical
 *   → iTunes enrichment
 *   → MusicBrainz fallback
 *   → merge
 *   → deduplicate
 *   → result
 */
export async function searchMetadata({
  query,
  dependencies = {},
  options = {},
}: MetadataSearchInput): Promise<MetadataSearchResult[]> {
  const parsedQuery = parseMetadataQuery(query);

  if (!parsedQuery.normalized) {
    return [];
  }

  const limit = Math.min(options.limit ?? 10, 50);

  const canonicalSearch = dependencies.searchCanonical ?? searchCanonical;

  const itunesSearch = dependencies.searchITunes ?? searchITunes;

  const itunesSearchByMetadata =
    dependencies.searchITunesByMetadata ?? searchITunesByMetadata;

  const musicBrainzSearch = dependencies.searchMusicBrainz ?? searchMusicBrainz;

  logger.debug(
    {
      query: parsedQuery.normalized,
      limit,
      providers: [
        dependencies.canonical ? "canonical" : null,
        "itunes",
        "musicbrainz",
      ].filter(Boolean),
    },
    "Starting metadata search",
  );

  let canonicalResults: CanonicalSearchResult[] = [];

  if (dependencies.canonical) {
    try {
      canonicalResults = await canonicalSearch(dependencies.canonical, {
        query: parsedQuery.normalized,
        limit: Math.min(limit * 2, 50),
      });
    } catch (error) {
      logger.warn(
        {
          err: error,
          provider: "canonical",
          query: parsedQuery.normalized,
        },
        "Canonical search failed, falling back to iTunes",
      );
    }
  }

  const normalizedResults: NormalizedMetadata[] = [];

  /**
   * Canonical menjadi candidate retrieval utama.
   *
   * Setiap candidate Canonical dikirim ke iTunes menggunakan
   * artist + title + album untuk enrichment.
   */
  if (canonicalResults.length > 0) {
    const resultsByCandidate = await fetchITunesByMetadata(
      canonicalResults,
      options.country ?? "us",
      itunesSearchByMetadata,
    );

    const musicBrainzResults = await fetchMusicBrainzFallback(
      canonicalResults,
      resultsByCandidate,
      musicBrainzSearch,
    );

    for (const canonicalResult of canonicalResults) {
      const canonicalMetadata = normalizeCanonical(canonicalResult);

      const candidateKey = [
        normalizeQuery(canonicalMetadata.artist),
        normalizeQuery(canonicalMetadata.title),
        normalizeQuery(canonicalMetadata.album),
      ].join("|");

      const itunesResults = resultsByCandidate.get(candidateKey) ?? [];

      const itunesMatch = selectITunesMatch(canonicalMetadata, itunesResults);

      if (itunesMatch) {
        normalizedResults.push(
          mergeMetadata(canonicalMetadata, normalizeITunes(itunesMatch)),
        );

        continue;
      }

      /**
       * iTunes tidak menemukan match.
       *
       * Gunakan Recording MBID dari Canonical untuk
       * mengambil metadata langsung dari MusicBrainz.
       */
      const musicBrainzResult = canonicalMetadata.recordingMbid
        ? musicBrainzResults.get(canonicalMetadata.recordingMbid)
        : undefined;

      const musicBrainzMetadata = musicBrainzResult
        ? normalizeMusicBrainz(musicBrainzResult)
        : undefined;

      normalizedResults.push(
        mergeMetadata(canonicalMetadata, musicBrainzMetadata),
      );
    }
  }

  /**
   * Fallback ke iTunes hanya ketika Canonical tidak menghasilkan
   * candidate atau Canonical tidak tersedia.
   */
  if (normalizedResults.length === 0) {
    try {
      const itunesResults = await itunesSearch({
        artist: "",
        title: parsedQuery.normalized,
        album: "",
        country: options.country ?? "us",
        limit: Math.min(limit * 3, 50),
      });

      for (const result of itunesResults) {
        normalizedResults.push(normalizeITunes(result));
      }
    } catch (error) {
      logger.warn(
        {
          err: error,
          provider: "itunes",
          query: parsedQuery.normalized,
        },
        "iTunes search failed",
      );
    }
  }

  /**
   * Canonical sudah menentukan urutan candidate berdasarkan
   * ranking dataset-nya. Di tahap ini kita hanya deduplicate
   * tanpa melakukan relevance scoring tambahan.
   */
  const deduplicatedResults = deduplicateResults(normalizedResults);

  const finalResults = deduplicatedResults.slice(0, limit);

  logger.debug(
    {
      query: parsedQuery.normalized,
      canonicalCandidateCount: canonicalResults.length,
      candidateCount: normalizedResults.length,
      resultCount: finalResults.length,
    },
    "Metadata search completed",
  );

  return finalResults;
}
