// Export metadata search service.
export { MetadataSearchService } from "./search";

// Export service dependencies.
export type { MetadataSearchServiceDependencies } from "./search";

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
