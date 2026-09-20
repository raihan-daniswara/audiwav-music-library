import type { Sql } from "postgres";

export interface CanonicalClientOptions {
  connectionString: string;
  maxConnections?: number;
}

/**
 * Client PostgreSQL untuk database Canonical.
 */
export type CanonicalClient = Sql;

/**
 * Parameter pencarian Canonical berdasarkan combined lookup.
 */
export interface CanonicalSearchOptions {
  query: string;
  limit?: number;
}

/**
 * Hasil pencarian dari database Canonical.
 */
export interface CanonicalSearchResult {
  id: string;
  artist_credit_id: string;
  artist_mbids: string;
  artist_credit_name: string;
  release_mbid: string;
  release_name: string;
  recording_mbid: string;
  recording_name: string;
  combined_lookup: string;
  score: number;
}
