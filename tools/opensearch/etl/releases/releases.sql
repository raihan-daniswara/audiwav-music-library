WITH batch AS (
    SELECT
        id,
        gid AS mbid,
        name,
        artist_credit,
        release_group,
        status,
        packaging,
        language,
        script,
        barcode
    FROM release
    WHERE id > $1 AND id <= $2
    ORDER BY id
    LIMIT $3
)
SELECT
    b.id,
    b.mbid,
    b.name,
    b.artist_credit,
    b.release_group,
    b.status,
    b.packaging,
    b.language,
    b.script,
    b.barcode,
    rg.gid AS release_group_mbid,
    rg.name AS release_group_name,
    rs.name AS status_name,
    rp.name AS packaging_name,
    l.name AS language_name,
    s.name AS script_name,
    rm.cover_art_presence
FROM batch b
JOIN release_group rg
    ON rg.id = b.release_group
LEFT JOIN release_status rs
    ON rs.id = b.status
LEFT JOIN release_packaging rp
    ON rp.id = b.packaging
LEFT JOIN language l
    ON l.id = b.language
LEFT JOIN script s
    ON s.id = b.script
LEFT JOIN release_meta rm
    ON rm.id = b.id
ORDER BY b.id;
