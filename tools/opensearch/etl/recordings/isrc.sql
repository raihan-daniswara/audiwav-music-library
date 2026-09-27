SELECT
    recording,
    isrc
FROM isrc
WHERE recording = ANY($1)
ORDER BY recording;
