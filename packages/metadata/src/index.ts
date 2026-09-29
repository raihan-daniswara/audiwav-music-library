// Export iTunes provider.
export { ITunesClient, searchITunes, searchITunesByMetadata } from "./itunes";

export type {
  ITunesSearchOptions,
  ITunesSearchResult,
  ITunesSearchResponse,
} from "./itunes";

// Export OpenSearch provider
export { OpenSearchClient, searchTracks, searchArtists, searchAlbums } from "./opensearch";

export { getCoverArtForRecording } from "./opensearch/artwork";

export type {
  OpenSearchTrackResult,
  OpenSearchArtistResult,
  OpenSearchAlbumResult,
} from "./opensearch";

// Export MusicBrainz bindings
export * from "./musicbrainz/client";
export * from "./musicbrainz/types";
export * from "./musicbrainz/detail/song";
export * from "./musicbrainz/detail/album";
export * from "./musicbrainz/detail/artist";
