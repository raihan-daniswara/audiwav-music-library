import { musicBrainzFetch } from "./client";

interface RecordingLookupResponse {
  id: string;
  title: string;
  length?: number;

  "artist-credit"?: Array<{
    name: string;
    artist: {
      id: string;
      name: string;
    };
  }>;

  releases?: Array<{
    id: string;
    title: string;
    date?: string;
    country?: string;

    "release-group"?: {
      id: string;
      title: string;
      "primary-type"?: string;
    };
  }>;
}

export async function lookupRecording(recordingMbid: string) {
  return musicBrainzFetch<RecordingLookupResponse>(
    `recording/${recordingMbid}`,
    {
      fmt: "json",
      inc: "artist-credits+releases+release-groups",
    },
  );
}
