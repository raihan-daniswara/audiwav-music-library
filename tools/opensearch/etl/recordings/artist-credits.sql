SELECT
    acn.artist_credit,
    acn.position,
    acn.join_phrase,
    a.gid AS artist_mbid,
    a.name AS artist_name
FROM artist_credit_name acn
JOIN artist a
    ON a.id = acn.artist
WHERE acn.artist_credit = ANY($1)
ORDER BY
    acn.artist_credit,
    acn.position;