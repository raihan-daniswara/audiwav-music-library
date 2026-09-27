SELECT
    artist,
    name
FROM artist_alias
WHERE artist = ANY($1)
ORDER BY artist;