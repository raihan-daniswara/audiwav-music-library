// Export Canonical provider.
export { createCanonicalClient, searchCanonical } from "./canonical";

export type {
  CanonicalClient,
  CanonicalClientOptions,
  CanonicalSearchOptions,
  CanonicalSearchResult,
} from "./canonical";

// Export iTunes provider.
export { ITunesClient, searchITunes, searchITunesByMetadata } from "./itunes";

export type {
  ITunesSearchOptions,
  ITunesSearchResult,
  ITunesSearchResponse,
} from "./itunes";

// Export MusicBrainz provider.
export { MusicBrainzClient, searchMusicBrainz } from "./musicbrainz";

export type {
  MusicBrainzRecordingResponse,
  MusicBrainzSearchResult,
} from "./musicbrainz";
