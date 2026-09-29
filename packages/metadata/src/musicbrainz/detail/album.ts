import { logger } from "@audiwav/logger";
import { mbClient } from "../client";
import type { AlbumDetailResponse } from "../types";

export async function getAlbumDetailFromDB(mbid: string): Promise<AlbumDetailResponse | null> {
  try {
    const result = await mbClient`
SELECT jsonb_build_object(

  /* ============================================================
   * ALBUM / RELEASE GROUP
   * ============================================================ */
  'album', jsonb_build_object(
      'mbid', rg.gid,
      'name', rg.name,
      'type', (SELECT rgpt.name FROM release_group_primary_type rgpt WHERE rgpt.id = rg.type),
      'firstReleaseDate', CASE WHEN rgm.first_release_date_year IS NOT NULL THEN
          lpad(rgm.first_release_date_year::text, 4, '0') ||
          CASE WHEN rgm.first_release_date_month IS NOT NULL THEN '-' || lpad(rgm.first_release_date_month::text, 2, '0') ELSE '' END ||
          CASE WHEN rgm.first_release_date_day IS NOT NULL THEN '-' || lpad(rgm.first_release_date_day::text, 2, '0') ELSE '' END
        ELSE NULL END,
      'rating', rgm.rating,
      'ratingCount', rgm.rating_count,
      'aliases', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('name', rga.name, 'locale', rga.locale, 'sortName', rga.sort_name, 'primaryForLocale', rga.primary_for_locale)
            ORDER BY rga.name
          ) FROM release_group_alias rga WHERE rga.release_group = rg.id
        ), '[]'::jsonb),
      'tags', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('id', t.id, 'name', t.name, 'count', rgt.count)
            ORDER BY rgt.count DESC, t.name
          ) FROM release_group_tag rgt JOIN tag t ON t.id = rgt.tag WHERE rgt.release_group = rg.id AND rgt.count > 0
        ), '[]'::jsonb),
      'annotation', (
        SELECT an.text FROM release_group_annotation rga JOIN annotation an ON an.id = rga.annotation
        WHERE rga.release_group = rg.id ORDER BY an.created DESC LIMIT 1
      ),
      'artwork',
      jsonb_build_object('url', 'https://coverartarchive.org/release-group/' || rg.gid::text || '/front-500')
  ),

  /* ============================================================
   * ARTISTS (Album Level)
   * ============================================================ */
  'artists', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'mbid', a.gid,
          'name', a.name,
          'sortName', a.sort_name,
          'creditName', acn.name,
          'joinPhrase', acn.join_phrase,
          'position', acn.position,
          'type', (SELECT at.name FROM artist_type at WHERE at.id = a.type),
          'area', (SELECT jsonb_build_object('mbid', ar.gid, 'name', ar.name) FROM area ar WHERE ar.id = a.area),
          'rating', (SELECT am.rating FROM artist_meta am WHERE am.id = a.id),
          'ratingCount', (SELECT am.rating_count FROM artist_meta am WHERE am.id = a.id),
          'aliases', COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object('name', aa.name, 'locale', aa.locale, 'sortName', aa.sort_name, 'primaryForLocale', aa.primary_for_locale)
                ORDER BY aa.name
              ) FROM artist_alias aa WHERE aa.artist = a.id
            ), '[]'::jsonb),
          'tags', COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object('id', t.id, 'name', t.name, 'count', atg.count)
                ORDER BY atg.count DESC, t.name
              ) FROM artist_tag atg JOIN tag t ON t.id = atg.tag WHERE atg.artist = a.id AND atg.count > 0
            ), '[]'::jsonb),
          'annotation', (
            SELECT an.text FROM artist_annotation aa JOIN annotation an ON an.id = aa.annotation
            WHERE aa.artist = a.id ORDER BY an.created DESC LIMIT 1
          )
        ) ORDER BY acn.position
      ) FROM artist_credit_name acn JOIN artist a ON a.id = acn.artist WHERE acn.artist_credit = rg.artist_credit
    ), '[]'::jsonb),

  /* ============================================================
   * TRACKS (from the earliest / first release)
   * ============================================================ */
  'tracks', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'position', t.position,
        'number', t.number,
        'title', t.name,
        'durationMs', t.length,
        'recordingMbid', rec.gid,
        'artists', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'name', acn.name,
                'mbid', a.gid,
                'joinPhrase', acn.join_phrase
              ) ORDER BY acn.position
            ) FROM artist_credit_name acn JOIN artist a ON a.id = acn.artist WHERE acn.artist_credit = t.artist_credit
          ), '[]'::jsonb)
      ) ORDER BY m.position, t.position
    )
    FROM release rel
    JOIN medium m ON m.release = rel.id
    JOIN track t ON t.medium = m.id
    JOIN recording rec ON rec.id = t.recording
    WHERE rel.id = (
      SELECT id FROM release WHERE release_group = rg.id ORDER BY id LIMIT 1
    )
  ), '[]'::jsonb)

) as payload
FROM release_group rg
LEFT JOIN release_group_meta rgm ON rgm.id = rg.id
WHERE rg.gid = ${mbid}::uuid;
    `;

    if (result && result.length > 0 && result[0] && result[0].payload) {
      return result[0].payload as AlbumDetailResponse;
    }
    return null;
  } catch (error) {
    logger.error({ err: error, mbid }, "Failed to fetch album detail from MusicBrainz DB directly");
    return null;
  }
}
