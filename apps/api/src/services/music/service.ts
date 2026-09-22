import { logger } from "@audiwav/logger";
import type { AudioFinder, AudioQuery, AudioResult } from "@audiwav/music";
import { SlskdProvider } from "@audiwav/music"; // Import langsung SlskdProvider untuk direct action

export interface MusicServiceDependencies {
  finder?: AudioFinder;
  slskdDirect?: SlskdProvider; // Menambahkan injection slskd spesifik
}

export class MusicService {
  private readonly dependencies: MusicServiceDependencies;

  constructor(dependencies: MusicServiceDependencies = {}) {
    this.dependencies = dependencies;
  }

  /**
   * Mengambil URL stream audio terbaik dari sistem Fallback (Local S3 / JioSaavn / YouTube).
   */
  async getStream(query: AudioQuery): Promise<AudioResult | null> {
    const finder = this.dependencies.finder;

    if (!finder) {
      logger.error("MusicService requires a configured AudioFinder dependency");
      return null;
    }

    try {
      logger.debug(
        { artist: query.artist, title: query.title },
        "Requesting audio stream URL",
      );

      const result = await finder.find(query);
      return result;
    } catch (error) {
      logger.error(
        { err: error, artist: query.artist, title: query.title },
        "MusicService failed to retrieve stream",
      );
      return null;
    }
  }

  /**
   * Mengirim perintah SINKRONISASI agar P2P Daemon mencari & merestorasi FLAC
   */
  async queueFlacDownload(query: AudioQuery) {
    const slskd = this.dependencies.slskdDirect;

    if (!slskd) {
      return { success: false, message: "Slskd engine is not configured in service setup." };
    }

    return await slskd.triggerDownload(query);
  }
}
