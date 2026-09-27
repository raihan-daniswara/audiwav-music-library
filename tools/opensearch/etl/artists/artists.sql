WITH batch AS (
    SELECT id, gid, name, sort_name
    FROM artist
    WHERE id > $1 AND id <= $2
    ORDER BY id
    LIMIT $3
)
SELECT
    b.id,
    b.gid,
    b.name,
    b.sort_name,
    am.rating,
    am.rating_count
FROM batch b
LEFT JOIN artist_meta am ON am.id = b.id
ORDER BY b.id;
