import { logger } from "@audiwav/logger";
import { mbClient } from "./client";

import type { TrackDetailResponse } from "./types";

export async function getTrackDetailFromDB(mbid: string): Promise<TrackDetailResponse | null> {
  try {
    const result = await mbClient`
SELECT jsonb_build_object(

  /* ============================================================
   * TRACK
   * ============================================================ */
  'track',
  jsonb_build_object(
    'mbid', r.gid,
    'title', r.name,
    'durationMs', r.length,
    'rating', (SELECT rm.rating FROM recording_meta rm WHERE rm.id = r.id),
    'ratingCount', (SELECT rm.rating_count FROM recording_meta rm WHERE rm.id = r.id),
    'isrc', COALESCE((
        SELECT jsonb_agg(i.isrc ORDER BY i.isrc) FROM isrc i WHERE i.recording = r.id
      ), '[]'::jsonb),
    'aliases', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', ra.name, 'locale', ra.locale,
            'sortName', ra.sort_name, 'primaryForLocale', ra.primary_for_locale
          ) ORDER BY ra.name
        ) FROM recording_alias ra WHERE ra.recording = r.id
      ), '[]'::jsonb),
    'tags', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object('id', t.id, 'name', t.name, 'count', rt.count)
          ORDER BY rt.count DESC, t.name
        ) FROM recording_tag rt JOIN tag t ON t.id = rt.tag WHERE rt.recording = r.id AND rt.count > 0
      ), '[]'::jsonb),
    'annotation', (
      SELECT an.text FROM recording_annotation ra JOIN annotation an ON an.id = ra.annotation
      WHERE ra.recording = r.id ORDER BY an.created DESC LIMIT 1
    )
  ),

  /* ============================================================
   * ARTISTS
   * ============================================================ */
  'artists',
  COALESCE((
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
      ) FROM artist_credit_name acn JOIN artist a ON a.id = acn.artist WHERE acn.artist_credit = r.artist_credit
    ), '[]'::jsonb),


  /* ============================================================
   * ALBUM / RELEASE GROUP
   * ============================================================ */
  'album',
  (
    SELECT jsonb_build_object(
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
    ) FROM release_group rg LEFT JOIN release_group_meta rgm ON rgm.id = rg.id
      WHERE rg.id = (
        SELECT rel.release_group FROM release rel JOIN medium m ON m.release = rel.id JOIN track tr ON tr.medium = m.id
        WHERE tr.recording = r.id ORDER BY rel.id LIMIT 1
      )
  ),

  /* ============================================================
   * LOCAL AUDIO
   * ============================================================ */
  'local',
  jsonb_build_object('available', false, 'format', NULL, 'codec', NULL, 'bitrate', NULL, 'bitDepth', NULL, 'sampleRate', NULL, 'channels', NULL, 'sizeBytes', NULL)

) as payload
FROM recording r
WHERE r.gid = ${mbid}::uuid;
    `;

    if (result && result.length > 0 && result[0] && result[0].payload) {
      return result[0].payload as TrackDetailResponse;
    }
    return null;
  } catch (error) {
    logger.error({ err: error, mbid }, "Failed to fetch recording detail from MusicBrainz DB directly");
    return null;
  }
}
