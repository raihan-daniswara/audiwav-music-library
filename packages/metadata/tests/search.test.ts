import { describe, expect, test } from "bun:test";

import type {
  CanonicalClient,
  CanonicalSearchResult,
} from "../src/canonical/types";
import type { ITunesSearchResult } from "../src/itunes/types";
import { searchMetadata } from "../src/search";

/**
 * Membuat data iTunes minimal untuk kebutuhan unit test.
 */
function createITunesResult(
  overrides: Partial<ITunesSearchResult> = {},
): ITunesSearchResult {
  return {
    artistId: 1,
    collectionId: 1,
    trackId: 1,

    artistName: "ABBA",
    collectionName: "Arrival",
    trackName: "Dancing Queen",

    artistViewUrl: "https://example.com/artist",
    collectionViewUrl: "https://example.com/album",
    trackViewUrl: "https://example.com/track",

    country: "USA",

    ...overrides,
  };
}

/**
 * Membuat data Canonical minimal untuk kebutuhan unit test.
 */
function createCanonicalResult(
  overrides: Partial<CanonicalSearchResult> = {},
): CanonicalSearchResult {
  return {
    id: "1",
    artist_credit_id: "1",
    artist_mbids: "artist-mbid",
    artist_credit_name: "ABBA",

    release_mbid: "release-mbid",
    release_name: "Arrival",

    recording_mbid: "recording-mbid",
    recording_name: "Dancing Queen",

    combined_lookup: "abbadancingqueen",
    score: 100,

    ...overrides,
  };
}

/**
 * Client Canonical palsu.
 *
 * Search engine hanya membutuhkan object ini sebagai dependency.
 */
const fakeCanonicalClient = {} as CanonicalClient;

describe("searchMetadata", () => {
  test("returns iTunes results when Canonical is unavailable", async () => {
    const results = await searchMetadata({
      query: "ABBA Dancing Queen",
      dependencies: {
        searchITunes: async () => [createITunesResult()],
      },
    });

    expect(results).toHaveLength(1);

    const result = results[0];

    if (!result) {
      throw new Error("Expected a search result");
    }

    expect(result).toMatchObject({
      title: "Dancing Queen",
      artist: "ABBA",
      album: "Arrival",
      sources: ["itunes"],
    });

    // iTunes tidak memiliki Canonical score.
    expect(result.score).toBeUndefined();
  });

  test("combines iTunes and Canonical metadata", async () => {
    const results = await searchMetadata({
      query: "ABBA Dancing Queen",
      dependencies: {
        canonical: fakeCanonicalClient,

        searchITunesByMetadata: async () => [createITunesResult()],

        searchCanonical: async () => [createCanonicalResult()],
      },
    });

    expect(results).toHaveLength(1);

    const result = results[0];

    if (!result) {
      throw new Error("Expected a search result");
    }

    expect(result).toMatchObject({
      title: "Dancing Queen",
      artist: "ABBA",
      album: "Arrival",
    });

    // Score berasal dari Canonical database.
    expect(result.score).toBe(100);

    // Canonical menjadi source utama dan iTunes menjadi enrichment.
    expect(result.sources).toEqual(["canonical", "itunes"]);

    // MBID berasal dari Canonical.
    expect(result.recordingMbid).toBe("recording-mbid");

    // Source URL berasal dari iTunes.
    expect(result.sourceUrl).toBe("https://example.com/track");
  });

  test("queries iTunes using Canonical artist, title, and album", async () => {
    let iTunesCallCount = 0;

    const results = await searchMetadata({
      query: "ABBA Dancing Queen",
      dependencies: {
        canonical: fakeCanonicalClient,

        searchCanonical: async () => [createCanonicalResult()],

        searchITunesByMetadata: async (options) => {
          iTunesCallCount += 1;

          expect(options).toMatchObject({
            artist: "ABBA",
            title: "Dancing Queen",
            album: "Arrival",
            country: "us",
            limit: 50,
          });

          return [createITunesResult()];
        },
      },
    });

    expect(results).toHaveLength(1);
    expect(iTunesCallCount).toBe(1);

    const result = results[0];

    if (!result) {
      throw new Error("Expected a search result");
    }

    expect(result.sources).toEqual(["canonical", "itunes"]);
    expect(result.score).toBe(100);
  });

  test("deduplicates the same track from multiple providers", async () => {
    const results = await searchMetadata({
      query: "ABBA Dancing Queen",
      dependencies: {
        canonical: fakeCanonicalClient,

        searchITunesByMetadata: async () => [createITunesResult()],

        searchCanonical: async () => [createCanonicalResult()],
      },
    });

    expect(results).toHaveLength(1);

    const result = results[0];

    if (!result) {
      throw new Error("Expected a search result");
    }

    expect(result.sources).toHaveLength(2);

    // Score Canonical tetap dipertahankan setelah deduplication.
    expect(result.score).toBe(100);
  });

  test("queries each unique Canonical metadata candidate separately", async () => {
    const iTunesQueries: string[] = [];

    const results = await searchMetadata({
      query: "ABBA Dancing Queen",
      dependencies: {
        canonical: fakeCanonicalClient,

        searchCanonical: async () => [
          createCanonicalResult({
            id: "1",
            recording_mbid: "recording-1",
          }),
          createCanonicalResult({
            id: "2",
            artist_credit_name: "Abbacadabra",
            artist_mbids: "artist-2",
            release_name: "Abbasalute",
            recording_mbid: "recording-2",
          }),
          createCanonicalResult({
            id: "3",
            artist_credit_name: "ABBA Dance",
            artist_mbids: "artist-3",
            release_name: "Dancing Album",
            recording_mbid: "recording-3",
          }),
        ],

        searchITunesByMetadata: async (options) => {
          iTunesQueries.push(
            `${options.artist} ${options.title} ${options.album}`,
          );

          return [];
        },
      },
    });

    expect(results).toHaveLength(3);

    expect(iTunesQueries).toEqual([
      "ABBA Dancing Queen Arrival",
      "Abbacadabra Dancing Queen Abbasalute",
      "ABBA Dance Dancing Queen Dancing Album",
    ]);
  });

  test("respects the result limit", async () => {
    const results = await searchMetadata({
      query: "ABBA",
      dependencies: {
        searchITunes: async () => [
          createITunesResult({
            trackId: 1,
            trackName: "Dancing Queen",
          }),
          createITunesResult({
            trackId: 2,
            trackName: "Mamma Mia",
          }),
          createITunesResult({
            trackId: 3,
            trackName: "Waterloo",
          }),
        ],
      },
      options: {
        limit: 2,
      },
    });

    expect(results).toHaveLength(2);
  });

  test("returns empty array for an empty query", async () => {
    const results = await searchMetadata({
      query: "   ",
      dependencies: {
        searchITunes: async () => {
          throw new Error("iTunes should not be called for an empty query");
        },
      },
    });

    expect(results).toEqual([]);
  });

  test("continues when iTunes fails", async () => {
    const results = await searchMetadata({
      query: "ABBA Dancing Queen",
      dependencies: {
        canonical: fakeCanonicalClient,

        searchITunesByMetadata: async () => {
          throw new Error("iTunes unavailable");
        },

        searchCanonical: async () => [createCanonicalResult()],
      },
    });

    // Jika enrichment iTunes gagal, metadata Canonical
    // tetap dikembalikan sebagai hasil pencarian.
    expect(results).toHaveLength(1);

    const result = results[0];

    if (!result) {
      throw new Error("Expected a search result");
    }

    expect(result).toMatchObject({
      title: "Dancing Queen",
      artist: "ABBA",
      album: "Arrival",
      artistMbid: "artist-mbid",
      releaseMbid: "release-mbid",
      recordingMbid: "recording-mbid",
      sources: ["canonical"],
    });

    // Score Canonical tetap tersedia meskipun iTunes gagal.
    expect(result.score).toBe(100);
  });

  test("continues when Canonical fails", async () => {
    const results = await searchMetadata({
      query: "ABBA Dancing Queen",
      dependencies: {
        canonical: fakeCanonicalClient,

        searchITunes: async () => [createITunesResult()],

        searchCanonical: async () => {
          throw new Error("Canonical unavailable");
        },
      },
    });

    expect(results).toHaveLength(1);

    const result = results[0];

    if (!result) {
      throw new Error("Expected a search result");
    }

    // iTunes tetap menghasilkan metadata walaupun Canonical gagal.
    expect(result.sources).toEqual(["itunes"]);

    // iTunes tidak memiliki Canonical score.
    expect(result.score).toBeUndefined();
  });
});
