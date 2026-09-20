export interface ParsedMetadataQuery {
  // Query asli yang diberikan user.
  raw: string;

  // Query yang sudah dinormalisasi.
  normalized: string;

  // Token unik dari query.
  tokens: string[];
}

/**
 * Menormalisasi teks untuk perbandingan metadata.
 */
export function normalizeQuery(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Memecah query menjadi token unik.
 */
export function tokenizeQuery(value: string): string[] {
  const normalized = normalizeQuery(value);

  if (!normalized) {
    return [];
  }

  return [...new Set(normalized.split(" "))];
}

/**
 * Memproses query user menjadi bentuk yang siap digunakan
 * oleh search engine.
 */
export function parseMetadataQuery(value: string): ParsedMetadataQuery {
  const raw = value.trim();
  const normalized = normalizeQuery(raw);

  return {
    raw,
    normalized,
    tokens: tokenizeQuery(normalized),
  };
}
