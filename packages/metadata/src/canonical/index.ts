export { createCanonicalClient } from "./client";

export { searchCanonical } from "./search";

export {
  buildExactWeightedScoreSql,
  buildFuzzyWeightedScoreSql,
  buildPopularityWeightSql,
  calculateTrigramSimilarity,
  calculateWeightedScore,
  sortCanonicalResults,
} from "./weighting";
export type { ExactWeightingConfig, FuzzyWeightingConfig } from "./weighting";

export type {
  CanonicalClient,
  CanonicalClientOptions,
  CanonicalSearchOptions,
  CanonicalSearchResult,
} from "./types";
