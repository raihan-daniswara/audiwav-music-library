WITH batch AS (
    SELECT id, gid, name, artist_credit, type
    FROM release_group
    WHERE id > $1 AND id <= $2
    ORDER BY id
    LIMIT $3
)
SELECT
    b.id,
    b.gid AS mbid,
    b.name,
    b.artist_credit,
    rgpt.name AS type,
    rm.rating,
    rm.rating_count
FROM batch b
LEFT JOIN release_group_primary_type rgpt
    ON rgpt.id = b.type
LEFT JOIN release_group_meta rm
    ON rm.id = b.id
ORDER BY b.id;
