import { logger } from "@audiwav/logger";
import { getAlbumDetailFromDB } from "@audiwav/metadata";
import type { AlbumDetailResponse } from "@audiwav/metadata";

export class AlbumDetailService {
  async getAlbumDetail(albumMbid: string): Promise<AlbumDetailResponse | { error: string }> {
    if (!albumMbid) {
       return { error: "Album MBID required" };
    }

    try {
       logger.debug({ mbid: albumMbid }, "Fetching rich album detail payload from PostgreSQL...");
       
       const payload = await getAlbumDetailFromDB(albumMbid);
       
       if (!payload) {
         logger.warn({ mbid: albumMbid }, "Album MBID not found in PostgreSQL Database!");
         return { error: "Not found in database" };
       }

       // Artwork artis (via Wikidata) telah dipisah ke asinkron di Frontend via `/artist/artwork?mbid=`
       // agar tidak memblokir render halaman Album / Track selama ~3 detik saat menunggu respon global SPARQL.
       
       logger.info({ mbid: albumMbid, albumTitle: payload.album.name }, "Album detail enrichment fully complete.");
       return payload;

    } catch (e) {
       logger.error({ err: e, mbid: albumMbid }, "Fatal error executing getAlbumDetail JSONB aggregator.");
       return { error: "Internal server error" };
    }
  }
}
