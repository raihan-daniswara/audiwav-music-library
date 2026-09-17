export interface MetadataInput {
  artist?: string;
  title: string;
  album?: string;
}

export interface CanonicalRecording {
  id: number;
  artistCreditId: number;
  artistMbids: string;
  artistCreditName: string;
  releaseMbid: string;
  releaseName: string;
  recordingMbid: string;
  recordingName: string;
  combinedLookup: string;
  score: number;
}

export interface MetadataMatch {
  recordingMbid: string;
  releaseMbid: string;
  artistMbids: string;
  artist: string;
  title: string;
  release: string;
  source: "canonical" | "musicbrainz";
}
