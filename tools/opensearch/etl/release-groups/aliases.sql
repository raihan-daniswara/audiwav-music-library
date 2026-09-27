SELECT
    release_group,
    name
FROM release_group_alias
WHERE release_group = ANY($1)
ORDER BY release_group;