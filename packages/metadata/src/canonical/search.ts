import { canonicalDb } from "./client";
import { createCombinedLookup } from "@/normalizer";

export async function findByArtistAndTitle(artist: string, title: string) {
  const combinedLookup = createCombinedLookup(artist, title);

  const [result] = await canonicalDb`
    SELECT
      id,
      artist_credit_id,
      artist_mbids,
      artist_credit_name,
      release_mbid,
      release_name,
      recording_mbid,
      recording_name,
      combined_lookup,
      score
    FROM canonical_musicbrainz_data
    WHERE combined_lookup = ${combinedLookup}
    ORDER BY score ASC
    LIMIT 1
  `;

  return result ?? null;
}

export async function findByTitle(title: string) {
  const results = await canonicalDb`
    SELECT
      id,
      artist_credit_id,
      artist_mbids,
      artist_credit_name,
      release_mbid,
      release_name,
      recording_mbid,
      recording_name,
      combined_lookup,
      score
    FROM canonical_musicbrainz_data
    WHERE recording_name = ${title}
    ORDER BY score ASC
    LIMIT 20
  `;

  return [...results];
}

export async function findByTitleAndRelease(title: string, release: string) {
  const results = await canonicalDb`
    SELECT
      id,
      artist_credit_id,
      artist_mbids,
      artist_credit_name,
      release_mbid,
      release_name,
      recording_mbid,
      recording_name,
      combined_lookup,
      score
    FROM canonical_musicbrainz_data
    WHERE recording_name = ${title}
      AND release_name = ${release}
    ORDER BY score ASC
  `;

  return [...results];
}
