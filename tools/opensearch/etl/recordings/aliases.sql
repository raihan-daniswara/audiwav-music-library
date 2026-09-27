SELECT
    recording,
    name
FROM recording_alias
WHERE recording = ANY($1)
ORDER BY recording;
