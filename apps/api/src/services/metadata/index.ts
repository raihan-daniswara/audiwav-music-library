// Export metadata search & detail services.
export { MetadataSearchService } from "./search";

export { SongDetailService } from "./detail/song";
export type { MetadataDetailOptions } from "./detail/song";

export { AlbumDetailService } from "./detail/album";

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
export { ArtistDetailService } from "./detail/artist";
