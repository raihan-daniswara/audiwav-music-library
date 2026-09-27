SELECT
    at.artist,
    t.id,
    t.name
FROM artist_tag at
JOIN tag t
    ON t.id = at.tag
WHERE at.artist = ANY($1)
ORDER BY
    at.artist,
    t.id;
