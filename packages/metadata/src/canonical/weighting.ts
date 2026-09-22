import type { Sql } from "postgres";
import type { CanonicalSearchResult } from "./types";

export interface FuzzyWeightingConfig {
  /** Bobot kesesuaian teks gabungan (default: 0.65) */
  combinedLookupWeight?: number;
  /** Bobot kesesuaian nama lagu persis (default: 0.20) */
  recordingNameWeight?: number;
  /** Bobot popularitas skor Canonical (default: 0.15) */
  popularityWeight?: number;
}

export interface ExactWeightingConfig {
  /** Bobot kesesuaian nama lagu persis (default: 0.60) */
  recordingNameWeight?: number;
  /** Bobot popularitas skor Canonical (default: 0.40) */
  popularityWeight?: number;
}

function normalizeLookup(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Menghitung Trigram Similarity antara dua string (0.0 - 1.0).
 */
export function calculateTrigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const getTrigrams = (str: string): Set<string> => {
    const padded = `  ${str} `;
    const set = new Set<string>();
    for (let i = 0; i < padded.length - 2; i++) {
      set.add(padded.slice(i, i + 3));
    }
    return set;
  };

  const triA = getTrigrams(a.toLowerCase());
  const triB = getTrigrams(b.toLowerCase());

  let intersection = 0;
  for (const tri of triA) {
    if (triB.has(tri)) {
      intersection++;
    }
  }

  const union = triA.size + triB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Menghitung skor terbobot (weighted score) untuk kandidat jika judul lagunya berbeda.
 */
export function calculateWeightedScore(
  result: CanonicalSearchResult,
  rawQuery: string,
  lookup: string,
): number {
  const normTitle = normalizeLookup(result.recording_name);
  const normCombined = normalizeLookup(result.combined_lookup);

  const titleSim = calculateTrigramSimilarity(normTitle, lookup);
  const lookupSim = calculateTrigramSimilarity(normCombined, lookup);
  const popWeight = 1.0 / (1.0 + Math.log(Math.max(result.score, 1)));

  // Bonus tambahan jika judul lagu persis dengan query
  const exactTitleBonus = normTitle === lookup ? 0.25 : 0;

  return (
    lookupSim * 0.45 +
    titleSim * 0.30 +
    popWeight * 0.10 +
    exactTitleBonus
  );
}

/**
 * Pengurutan kandidat berbasis aturan:
 * 1. Jika judul lagu (recording_name) SAMA: Urutkan berdasarkan score ter-KECIL (score ASC).
 * 2. Jika judul lagu (recording_name) BEDA: Urutkan berdasarkan weighted score ter-TINGGI (weightedScore DESC).
 */
export function sortCanonicalResults(
  results: CanonicalSearchResult[],
  rawQuery: string,
  lookup: string,
): CanonicalSearchResult[] {
  return [...results].sort((a, b) => {
    const titleA = normalizeLookup(a.recording_name);
    const titleB = normalizeLookup(b.recording_name);

    // 1. Jika judul lagu SAMA persis -> prioritaskan score terkecil (score ASC)
    if (titleA === titleB) {
      return a.score - b.score;
    }

    // 2. Jika judul lagu BEDA -> gunakan weighted score (weightedScore DESC)
    const scoreA = calculateWeightedScore(a, rawQuery, lookup);
    const scoreB = calculateWeightedScore(b, rawQuery, lookup);

    if (Math.abs(scoreB - scoreA) > 0.001) {
      return scoreB - scoreA;
    }

    return a.score - b.score;
  });
}

/**
 * Menghitung ekspresi popularitas dari Canonical score untuk SQL.
 * Menggunakan skala logaritmik: 1.0 / (1.0 + ln(GREATEST(score, 1)))
 */
export function buildPopularityWeightSql(client: Sql) {
  return client`(1.0 / (1.0 + ln(GREATEST(score, 1))))`;
}

/**
 * Membangun ekspresi SQL weighted ranking untuk Exact Search.
 */
export function buildExactWeightedScoreSql(
  client: Sql,
  rawQuery: string,
  config: ExactWeightingConfig = {},
) {
  const recWeight = config.recordingNameWeight ?? 0.6;
  const popWeight = config.popularityWeight ?? 0.4;
  const popSql = buildPopularityWeightSql(client);

  return client`
    (
      similarity(lower(recording_name), lower(${rawQuery})) * ${recWeight} +
      ${popSql} * ${popWeight}
    )
  `;
}

/**
 * Membangun ekspresi SQL weighted ranking untuk Fuzzy Search.
 */
export function buildFuzzyWeightedScoreSql(
  client: Sql,
  lookup: string,
  rawQuery: string,
  config: FuzzyWeightingConfig = {},
) {
  const lookupWeight = config.combinedLookupWeight ?? 0.65;
  const recWeight = config.recordingNameWeight ?? 0.2;
  const popWeight = config.popularityWeight ?? 0.15;
  const popSql = buildPopularityWeightSql(client);

  return client`
    (
      similarity(combined_lookup, ${lookup}) * ${lookupWeight} +
      similarity(lower(recording_name), lower(${rawQuery})) * ${recWeight} +
      ${popSql} * ${popWeight}
    )
  `;
}
