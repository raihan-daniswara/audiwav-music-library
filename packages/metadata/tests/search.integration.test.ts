import { afterAll, describe, expect, test } from "bun:test";

import { createCanonicalClient } from "../src/canonical/client";
import type { ITunesSearchResult } from "../src/itunes/types";
import { searchMetadata } from "../src/search";

/**
 * Connection string database Canonical dari environment.
 *
 * Integration test membutuhkan database Canonical yang sedang berjalan.
 */
const canonicalDatabaseUrl = process.env.CANONICAL_DATABASE_URL;

if (!canonicalDatabaseUrl) {
  throw new Error("CANONICAL_DATABASE_URL is not configured");
}

/**
 * Client database Canonical sungguhan.
 *
 * Search akan mengambil candidate langsung dari PostgreSQL
 * menggunakan exact match atau fuzzy search pg_trgm.
 */
const canonicalClient = createCanonicalClient({
  connectionString: canonicalDatabaseUrl,
});

/**
 * Data iTunes minimal untuk simulasi enrichment.
 *
 * Request iTunes tetap di-mock agar integration test tidak
 * bergantung pada API iTunes yang sebenarnya.
 */
function createITunesResult(): ITunesSearchResult {
  return {
    artistId: 1,
    collectionId: 1422648512,
    trackId: 1422648513,

    artistName: "ABBA",
    collectionName: "Arrival",
    trackName: "Dancing Queen",

    artistViewUrl: "https://example.com/artist",
    collectionViewUrl: "https://example.com/album",
    trackViewUrl: "https://example.com/track",

    country: "US",

    releaseDate: "1976-01-01T00:00:00Z",
    trackTimeMillis: 231844,

    artworkUrl100: "https://example.com/artwork.jpg",

    discNumber: 1,
    discCount: 1,
    trackNumber: 1,
    trackCount: 10,

    primaryGenreName: "Pop",
    trackExplicitness: "notExplicit",
  };
}

describe("searchMetadata integration", () => {
  test("searches fuzzy Canonical candidates and enriches candidates using artist, title, and album", async () => {
    const iTunesCalls: ITunesSearchResult[][] = [];
    const iTunesQueries: string[] = [];

    /**
     * Sengaja menggunakan typo "Dancng".
     *
     * "ABBA Dancing Queen" akan menjadi exact match.
     * "ABBA Dancng Queen" memaksa searchCanonical()
     * masuk ke jalur fuzzy pg_trgm.
     */
    const query = "ABBA Dancng Queen";

    const results = await searchMetadata({
      query,
      dependencies: {
        canonical: canonicalClient,

        /**
         * iTunes di-mock untuk melihat metadata yang dikirim
         * oleh setiap candidate Canonical.
         */
        searchITunesByMetadata: async (options) => {
          iTunesQueries.push(
            `${options.artist} ${options.title} ${options.album}`,
          );

          /**
           * Hanya candidate ABBA - Dancing Queen - Arrival
           * yang mendapatkan hasil iTunes.
           */
          if (
            options.artist === "ABBA" &&
            options.title === "Dancing Queen" &&
            options.album === "Arrival"
          ) {
            const response = [createITunesResult()];

            iTunesCalls.push(response);

            return response;
          }

          iTunesCalls.push([]);

          return [];
        },
      },
      options: {
        country: "us",
        limit: 10,
      },
    });

    console.log("\nSearch query:");
    console.log(query);

    console.log("\niTunes metadata requests:");
    console.log(iTunesQueries);

    console.log("\nFinal results:");

    for (const [index, result] of results.entries()) {
      console.log(`${index + 1}.`, {
        title: result.title,
        artist: result.artist,
        album: result.album,
        score: result.score,
        durationMs: result.durationMs,
        releaseYear: result.releaseYear,
        artworkUrl: result.artworkUrl,
        sourceUrl: result.sourceUrl,
        recordingMbid: result.recordingMbid,
        sources: result.sources,
      });
    }

    /**
     * Search harus menghasilkan beberapa candidate dari
     * database Canonical, bukan hanya satu hasil exact match.
     */
    expect(results.length).toBeGreaterThanOrEqual(6);
    expect(results.length).toBeLessThanOrEqual(10);

    /**
     * Candidate utama harus dikirim ke iTunes menggunakan
     * artist + title + album dari Canonical.
     */
    expect(iTunesQueries).toContain("ABBA Dancing Queen Arrival");

    /**
     * Candidate utama yang relevan harus tetap ABBA.
     */
    const abbaResult = results.find(
      (result) => result.artist === "ABBA" && result.title === "Dancing Queen",
    );

    expect(abbaResult).toBeDefined();

    if (!abbaResult) {
      throw new Error("Expected ABBA - Dancing Queen result");
    }

    /**
     * Identity metadata berasal dari Canonical.
     */
    expect(abbaResult.sources).toContain("canonical");
    expect(abbaResult.recordingMbid).toBeTruthy();
    expect(abbaResult.artistMbid).toBeTruthy();
    expect(abbaResult.releaseMbid).toBeTruthy();

    /**
     * Metadata enrichment berasal dari iTunes.
     */
    expect(abbaResult.sources).toContain("itunes");
    expect(abbaResult.durationMs).toBe(231844);
    expect(abbaResult.releaseYear).toBe(1976);
    expect(abbaResult.artworkUrl).toBe("https://example.com/artwork.jpg");
    expect(abbaResult.sourceUrl).toBe("https://example.com/track");
  });
});

afterAll(async () => {
  await canonicalClient.end();
});
