SELECT
    rt.recording,
    t.id,
    t.name
FROM recording_tag rt
JOIN tag t
    ON t.id = rt.tag
WHERE rt.recording = ANY($1)
ORDER BY
    rt.recording,
    t.id;
