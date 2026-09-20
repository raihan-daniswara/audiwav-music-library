import { logger } from "@audiwav/logger";

import type { MusicBrainzRecordingResponse } from "./types";

const MUSICBRAINZ_API_URL = "https://musicbrainz.org/ws/2";

const USER_AGENT =
  "Audiwav/0.1.0 (https://github.com/raihandaniswara/audiwav-music-library)";

export class MusicBrainzClient {
  async getRecording(
    recordingMbid: string,
  ): Promise<MusicBrainzRecordingResponse> {
    const params = new URLSearchParams({
      inc: "releases",
      fmt: "json",
    });

    const url =
      `${MUSICBRAINZ_API_URL}/recording/` + `${recordingMbid}?${params}`;

    logger.debug(
      {
        provider: "musicbrainz",
        recordingMbid,
      },
      "Looking up MusicBrainz recording",
    );

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new Error(`MusicBrainz API returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as MusicBrainzRecordingResponse;

      logger.debug(
        {
          provider: "musicbrainz",
          recordingMbid,
        },
        "MusicBrainz recording lookup completed",
      );

      return data;
    } catch (error) {
      logger.error(
        {
          err: error,
          provider: "musicbrainz",
          recordingMbid,
        },
        "MusicBrainz recording lookup failed",
      );

      throw error;
    }
  }
}
