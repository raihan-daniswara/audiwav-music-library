import type { ITunesSearchOptions, ITunesSearchResult } from "./types";

import { ITunesClient } from "./client";

/**
 * Mencari metadata lagu di iTunes menggunakan artist, title, dan album.
 *
 * Ketiga field digabung menjadi satu search term karena iTunes Search API
 * menggunakan parameter term untuk pencarian.
 */
export async function searchITunes(
  options: ITunesSearchOptions,
): Promise<ITunesSearchResult[]> {
  const limit = Math.min(options.limit ?? 10, 200);

  const term = [options.artist, options.title, options.album]
    .filter(Boolean)
    .join(" ")
    .trim();

  const client = new ITunesClient(options.country ?? "us");

  const response = await client.search(term, limit);

  return response.results;
}

/**
 * Mencari iTunes berdasarkan metadata lengkap candidate Canonical.
 *
 * Artist, title, dan album digunakan bersama agar hasil pencarian
 * lebih spesifik terhadap candidate yang ditemukan Canonical.
 */
export async function searchITunesByMetadata(
  options: ITunesSearchOptions,
): Promise<ITunesSearchResult[]> {
  const limit = Math.min(options.limit ?? 50, 200);

  const term = [options.artist, options.title, options.album]
    .filter(Boolean)
    .join(" ")
    .trim();

  const client = new ITunesClient(options.country ?? "us");

  const response = await client.search(term, limit);

  return response.results;
}
