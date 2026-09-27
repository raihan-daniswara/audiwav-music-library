SELECT
    rgt.release_group,
    t.id,
    t.name
FROM release_group_tag rgt
JOIN tag t
    ON t.id = rgt.tag
WHERE rgt.release_group = ANY($1)
ORDER BY
    rgt.release_group,
    t.id;