import { musicBrainzFetch } from "./client";

interface RecordingSearchResponse {
  recordings: Array<{
    id: string;
    title: string;
    length?: number;
    score: number;
    "artist-credit"?: Array<{
      name: string;
      artist: {
        id: string;
        name: string;
      };
    }>;
  }>;

  count: number;
  offset: number;
}

export async function searchRecording(title: string, artist?: string) {
  const query = artist
    ? `recording:"${title}" AND artist:"${artist}"`
    : `recording:"${title}"`;

  return musicBrainzFetch<RecordingSearchResponse>("recording", {
    query,
    fmt: "json",
    limit: "25",
  });
}
