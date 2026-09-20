/**
 * Response recording dari MusicBrainz API.
 */
export interface MusicBrainzRecordingResponse {
  id: string;
  title: string;
  length?: number;

  "first-release-date"?: string;

  releases?: MusicBrainzReleaseResponse[];
}

export interface MusicBrainzReleaseResponse {
  id: string;
  title: string;
  date?: string;

  "track-count"?: number;
}

/**
 * Metadata MusicBrainz yang digunakan Audiwav.
 */
export interface MusicBrainzSearchResult {
  recordingMbid: string;
  durationMs?: number;

  releaseDate?: string;
  releaseYear?: number;

  releaseMbid?: string;
  releaseName?: string;
  trackCount?: number;
}
