import { createCanonicalClient, type CanonicalClient } from "@audiwav/metadata";

import { env } from "./env";

let canonicalClient: CanonicalClient | undefined;

/**
 * Membuat Canonical database client secara lazy.
 *
 * Client hanya dibuat ketika pertama kali dibutuhkan.
 */
export function getCanonicalClient(): CanonicalClient {
  if (!canonicalClient) {
    canonicalClient = createCanonicalClient({
      connectionString: env.CANONICAL_DATABASE_URL,
    });
  }

  return canonicalClient;
}
