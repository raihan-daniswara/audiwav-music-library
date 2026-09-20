import postgres from "postgres";
import { logger } from "@audiwav/logger";

import type { CanonicalClient, CanonicalClientOptions } from "./types";

/**
 * Membuat client PostgreSQL untuk database Canonical.
 */
export function createCanonicalClient(
  options: CanonicalClientOptions,
): CanonicalClient {
  const client = postgres(options.connectionString, {
    max: options.maxConnections ?? 5,
  });

  logger.debug(
    {
      provider: "canonical",
    },
    "Canonical database client created",
  );

  return client;
}
