import { MusicBrainzClient } from "./client";
import type { MusicBrainzSearchResult } from "./types";

/**
 * Mencari metadata recording berdasarkan Recording MBID.
 */
export async function searchMusicBrainz(
  recordingMbid: string,
): Promise<MusicBrainzSearchResult | undefined> {
  if (!recordingMbid) {
    return undefined;
  }

  const client = new MusicBrainzClient();

  const result = await client.getRecording(recordingMbid);

  const release = result.releases?.[0];
  const releaseDate = result["first-release-date"] ?? release?.date;

  return {
    recordingMbid: result.id,

    durationMs: result.length,

    releaseDate,
    releaseYear: releaseDate ? new Date(releaseDate).getFullYear() : undefined,

    releaseMbid: release?.id,
    releaseName: release?.title,
    trackCount: release?.["track-count"],
  };
}
