SELECT
    rc.release,
    rc.date_year,
    rc.date_month,
    rc.date_day,
    a.gid AS country_mbid,
    a.name AS country_name
FROM release_country rc
JOIN country_area ca
    ON ca.area = rc.country
JOIN area a
    ON a.id = ca.area
WHERE rc.release = ANY($1)
ORDER BY
    rc.release,
    rc.date_year NULLS LAST,
    rc.date_month NULLS LAST,
    rc.date_day NULLS LAST;
