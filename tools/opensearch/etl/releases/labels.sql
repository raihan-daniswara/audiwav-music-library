SELECT
    rl.release,
    l.gid AS label_mbid,
    l.name AS label_name,
    rl.catalog_number
FROM release_label rl
JOIN label l
    ON l.id = rl.label
WHERE rl.release = ANY($1)
ORDER BY
    rl.release,
    l.name;