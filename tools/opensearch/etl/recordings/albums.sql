SELECT DISTINCT ON (t.recording)
    t.recording AS recording_id,
    r.gid AS release_mbid,
    r.name AS release_name,
    rg.gid AS release_group_mbid,
    rm.cover_art_presence
FROM track t
JOIN medium m ON t.medium = m.id
JOIN release r ON m.release = r.id
JOIN release_group rg ON r.release_group = rg.id
LEFT JOIN release_group_primary_type rgpt ON rg.type = rgpt.id
LEFT JOIN release_meta rm ON r.id = rm.id
WHERE t.recording = ANY($1)
ORDER BY
    t.recording,
    (CASE WHEN rm.cover_art_presence = 'present' THEN 1 ELSE 2 END) ASC,
    (CASE WHEN rgpt.name = 'Album' THEN 1 WHEN rgpt.name = 'Single' THEN 2 ELSE 3 END) ASC,
    r.id ASC;
