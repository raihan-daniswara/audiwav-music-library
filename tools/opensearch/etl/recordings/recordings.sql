WITH batch AS (
    SELECT id, gid, name, length, artist_credit
    FROM recording
    WHERE id > $1 AND id <= $2
    ORDER BY id
    LIMIT $3
)
SELECT
    b.id,
    b.gid,
    b.name,
    b.length,
    b.artist_credit,
    rm.rating,
    rm.rating_count
FROM batch b
LEFT JOIN recording_meta rm ON rm.id = b.id
ORDER BY b.id;
