import { logger } from "@audiwav/logger";
import { getArtistDetailFromDB } from "@audiwav/metadata";
import type { ArtistDetailResponse } from "@audiwav/metadata";

export class ArtistDetailService {
  async getArtistDetail(artistMbid: string): Promise<ArtistDetailResponse | { error: string }> {
    if (!artistMbid) {
       return { error: "Artist MBID required" };
    }

    try {
       logger.debug({ mbid: artistMbid }, "Fetching rich artist detail payload from PostgreSQL...");
       
       const payload = await getArtistDetailFromDB(artistMbid);
       
       if (!payload) {
         logger.warn({ mbid: artistMbid }, "Artist MBID not found in PostgreSQL Database!");
         return { error: "Not found in database" };
       }

       return payload;
    } catch (err: any) {
       logger.error({ mbid: artistMbid, error: err.message }, "Error during artist detail DB fetch");
       return { error: "Internal Server Error" };
    }
  }
}
