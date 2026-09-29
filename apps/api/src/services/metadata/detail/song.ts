import { logger } from "@audiwav/logger";
import { getTrackDetailFromDB } from "@audiwav/metadata";
import type { TrackDetailResponse } from "@audiwav/metadata";
import { getArtistImageFromWiki } from "../wikimedia/query";
import type { NormalizedMetadata } from "../common/types";

export interface MetadataDetailOptions {
  country?: string;
}

export class SongDetailService {
  async getDetail(
    candidate: NormalizedMetadata,
    options: MetadataDetailOptions = {},
  ): Promise<TrackDetailResponse | { error: string }> { 
    
    let mbid = candidate.recordingMbid;
    
    if (!mbid) {
       logger.warn({ mbid: candidate.recordingMbid, title: candidate.title }, "No recordingMbid provided for JSONB detail fetch. Aborting.");
       return { error: "Mbid required" };
    }

    try {
       logger.debug({ mbid }, "Fetching rich metadata payload directly from PostgreSQL...");
       
       const payload = (await getTrackDetailFromDB(mbid)) as any;
       
       if (!payload) {
         logger.warn({ mbid }, "Track MBID not found in PostgreSQL Database!");
         return { error: "Not found in database" };
       }

       logger.debug({ mbid, trackTitle: payload.track.title }, "Database payload successfully fetched. Proceeding with Wikimedia logic...");

       // Inject Artwork artis (via Wikidata)
       if (payload.artists && payload.artists.length > 0) {
         const primaryArtistMbid = payload.artists[0]?.mbid;
         if (primaryArtistMbid) {
            try {
              const artistArt = await getArtistImageFromWiki(primaryArtistMbid);
              if (artistArt) {
                 logger.debug({ artistMbid: primaryArtistMbid, imageFound: true }, "Wikimedia SPARQL succeeded in fetching artist portrait.");
                 if (payload.artists[0]) payload.artists[0].artwork = { url: artistArt };
              } else {
                 logger.info({ artistMbid: primaryArtistMbid }, "Wikimedia SPARQL returned no picture for this artist.");
              }
            } catch (err) {
              logger.error({ err, artistMbid: primaryArtistMbid }, "Error extracting Wikimedia SPARQL fallback.");
            }
         }
       }
       
       logger.info({ mbid, trackTitle: payload.track.title, loadedArtists: payload.artists.length }, "Track detail enrichment fully complete.");
       return payload;

    } catch (e) {
       logger.error({ err: e, mbid }, "Fatal error executing getDetail JSONB aggregator.");
       return { error: "Internal server error" };
    }
  }
}
