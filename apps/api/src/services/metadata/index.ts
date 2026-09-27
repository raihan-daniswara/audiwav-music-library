// Export metadata search & detail services.
export { MetadataSearchService } from "./search";

export { MetadataDetailService } from "./detail";
export type { MetadataDetailOptions } from "./detail";

// Export shared metadata types.
export type {
  MetadataSearchOptions,
  MetadataSearchResult,
  MetadataSource,
  NormalizedMetadata,
} from "./common/types";

// Export query utilities.
export {
  normalizeQuery,
  parseMetadataQuery,
  tokenizeQuery,
} from "./common/query";
