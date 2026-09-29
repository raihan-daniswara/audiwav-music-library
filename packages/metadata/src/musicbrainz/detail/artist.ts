import { logger } from "@audiwav/logger";
import { mbClient } from "../client";
import type { ArtistDetailResponse } from "../types";

export async function getArtistDetailFromDB(mbid: string): Promise<ArtistDetailResponse | null> {
  try {
    const result = await mbClient`
SELECT jsonb_build_object(

  /* ============================================================
   * ARTIST METADATA
   * ============================================================ */
  'artist', jsonb_build_object(
      'mbid', a.gid,
      'name', a.name,
      'sortName', a.sort_name,
      'type', (SELECT at.name FROM artist_type at WHERE at.id = a.type),
      'area', (SELECT jsonb_build_object('mbid', ar.gid, 'name', ar.name) FROM area ar WHERE ar.id = a.area),
      'beginDate', CASE WHEN a.begin_date_year IS NOT NULL THEN
          lpad(a.begin_date_year::text, 4, '0') ||
          CASE WHEN a.begin_date_month IS NOT NULL THEN '-' || lpad(a.begin_date_month::text, 2, '0') ELSE '' END ||
          CASE WHEN a.begin_date_day IS NOT NULL THEN '-' || lpad(a.begin_date_day::text, 2, '0') ELSE '' END
        ELSE NULL END,
      'endDate', CASE WHEN a.end_date_year IS NOT NULL THEN
          lpad(a.end_date_year::text, 4, '0') ||
          CASE WHEN a.end_date_month IS NOT NULL THEN '-' || lpad(a.end_date_month::text, 2, '0') ELSE '' END ||
          CASE WHEN a.end_date_day IS NOT NULL THEN '-' || lpad(a.end_date_day::text, 2, '0') ELSE '' END
        ELSE NULL END,
      'rating', am.rating,
      'ratingCount', am.rating_count,
      'tags', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('id', sub_t.id, 'name', sub_t.name, 'count', sub_t.count)
          ) FROM (
            SELECT t.id, t.name, atg.count
            FROM artist_tag atg JOIN tag t ON t.id = atg.tag 
            WHERE atg.artist = a.id AND atg.count > 0
            ORDER BY atg.count DESC, t.name 
            LIMIT 30
          ) sub_t
        ), '[]'::jsonb),
      'annotation', (
        SELECT an.text FROM artist_annotation aa JOIN annotation an ON an.id = aa.annotation
        WHERE aa.artist = a.id ORDER BY an.created DESC LIMIT 1
      ),
      'urls', '[]'::jsonb
  ),

  /* ============================================================
   * TOP TRACKS (LAGU TERATAS) DENGAN ROW_NUMBER() DEDUPLIKASI
   * ============================================================ */
  'topTracks', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'title', final_t.name,
          'durationMs', final_t.length,
          'recordingMbid', final_t.recording_gid,
          'albumName', final_t.album_name,
          'albumMbid', final_t.album_gid,
          'artists', final_t.artists
        )
      )
      FROM (
        SELECT dedup_t.* 
        FROM (
          SELECT t.name, t.length, rec.gid as recording_gid,
                 rg.name as album_name, rg.gid as album_gid,
                 (
                   SELECT jsonb_agg(jsonb_build_object('name', acn_in.name, 'mbid', a_in.gid, 'joinPhrase', acn_in.join_phrase) ORDER BY acn_in.position)
                   FROM artist_credit_name acn_in
                   JOIN artist a_in ON a_in.id = acn_in.artist
                   WHERE acn_in.artist_credit = t.artist_credit
                 ) as artists,
                 -- Deduplicate: Hanya ambil rilis pertama/rating terbesar untuk nama rekaman yang sama berdasarkan lower(name)
                 ROW_NUMBER() OVER (
                    PARTITION BY lower(t.name) 
                    ORDER BY 
                      (SELECT rm.rating_count FROM recording_meta rm WHERE rm.id = rec.id) DESC NULLS LAST,
                      (SELECT rgm.first_release_date_year FROM release_group_meta rgm WHERE rgm.id = rg.id) ASC NULLS LAST
                 ) as rnk,
                 (SELECT rm.rating_count FROM recording_meta rm WHERE rm.id = rec.id) as rtg_cnt,
                 (SELECT rgm.first_release_date_year FROM release_group_meta rgm WHERE rgm.id = rg.id) as rls_yr
          FROM track t
          JOIN recording rec ON rec.id = t.recording
          JOIN medium m ON m.id = t.medium
          JOIN release rel ON rel.id = m.release
          JOIN release_group rg ON rg.id = rel.release_group
          JOIN artist_credit_name acn ON acn.artist_credit = t.artist_credit
          WHERE acn.artist = a.id
        ) dedup_t
        WHERE dedup_t.rnk = 1
        ORDER BY dedup_t.rtg_cnt DESC NULLS LAST, dedup_t.rls_yr DESC NULLS LAST
        LIMIT 10
      ) final_t
  ), '[]'::jsonb),

  /* ============================================================
   * DISCOGRAPHY / RELEASE GROUPS
   * ============================================================ */
  'releaseGroups', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'mbid', sub_rg.gid,
          'name', sub_rg.name,
          'type', sub_rg.type_name,
          'firstReleaseDate', sub_rg.first_release_date,
          'artworkUrl', 'https://coverartarchive.org/release-group/' || sub_rg.gid::text || '/front-500'
        )
      )
      FROM (
        SELECT rg.gid, rg.name, 
               (SELECT pt.name FROM release_group_primary_type pt WHERE pt.id = rg.type) as type_name,
               (CASE WHEN rgm.first_release_date_year IS NOT NULL THEN 
                  lpad(rgm.first_release_date_year::text, 4, '0') ||
                  CASE WHEN rgm.first_release_date_month IS NOT NULL THEN '-' || lpad(rgm.first_release_date_month::text, 2, '0') ELSE '' END
                ELSE NULL END) as first_release_date
        FROM release_group rg
        JOIN artist_credit_name acn ON acn.artist_credit = rg.artist_credit
        LEFT JOIN release_group_meta rgm ON rgm.id = rg.id
        WHERE acn.artist = a.id
        ORDER BY rgm.first_release_date_year DESC NULLS LAST, rg.name ASC
        LIMIT 100
      ) sub_rg
  ), '[]'::jsonb)

) as payload
FROM artist a
LEFT JOIN artist_meta am ON am.id = a.id
WHERE a.gid = ${mbid}::uuid;
    `;

    if (result && result.length > 0 && result[0] && result[0].payload) {
      return result[0].payload as ArtistDetailResponse;
    }
    return null;
  } catch (error) {
    logger.error({ err: error, mbid }, "Failed to fetch artist detail from MusicBrainz DB directly");
    return null;
  }
}
