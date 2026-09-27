import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import postgres from "postgres";

import { logger } from "@audiwav/logger";

type ReleaseRow = {
  id: number;
  mbid: string;
  name: string;
  artist_credit: number;
  release_group: number;
  status: number | null;
  packaging: number | null;
  language: number | null;
  script: number | null;
  barcode: string | null;
  release_group_mbid: string;
  release_group_name: string;
  status_name: string | null;
  packaging_name: string | null;
  language_name: string | null;
  script_name: string | null;
  cover_art_presence: "absent" | "present" | "darkened";
};

type ArtistCreditRow = {
  artist_credit: number;
  position: number;
  join_phrase: string;
  artist_mbid: string;
  artist_name: string;
};

type CountryRow = {
  release: number;
  date_year: number | null;
  date_month: number | null;
  date_day: number | null;
  country_mbid: string;
  country_name: string;
};

type LabelRow = {
  release: number;
  label_mbid: string;
  label_name: string;
  catalog_number: string | null;
};

type ReleaseDocument = {
  mbid: string;
  name: string;

  release_group: {
    mbid: string;
    name: string;
  };

  artist_credit: {
    display: string;
    artists: {
      mbid: string;
      name: string;
      position: number;
    }[];
  };

  status: string | null;
  packaging: string | null;

  countries: {
    mbid: string;
    name: string;
  }[];

  date: {
    year: number | null;
    month: number | null;
    day: number | null;
  };

  language: {
    id: number;
    name: string;
  } | null;

  script: {
    id: number;
    name: string;
  } | null;

  labels: {
    mbid: string;
    name: string;
    catalog_number: string | null;
  }[];

  barcode: string | null;

  cover_art: {
    has_cover: boolean;
  };
};

type BulkResponse = {
  errors: boolean;
  items: {
    index?: {
      status: number;
      error?: unknown;
    };
  }[];
};

export type ReleaseWorkerOptions = {
  workerId: number;
  startId: number;
  endId: number;
  batchSize: number;
};

const musicbrainzUrl = process.env.MUSICBRAINZ_DATABASE_URL;
const opensearchUrl = process.env.OPENSEARCH_URL;
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;

if (!musicbrainzUrl) {
  throw new Error("Missing MUSICBRAINZ_DATABASE_URL");
}

if (!opensearchUrl) {
  throw new Error("Missing OPENSEARCH_URL");
}

if (!username) {
  throw new Error("Missing OPENSEARCH_USERNAME");
}

if (!password) {
  throw new Error("Missing OPENSEARCH_PASSWORD");
}

const index = "audiwav_releases";

const workerDir = dirname(fileURLToPath(import.meta.url));
const etlPath = join(workerDir, "../etl/releases");

const releasesQuery = await readFile(join(etlPath, "releases.sql"), "utf8");

const artistCreditsQuery = await readFile(
  join(etlPath, "artist-credits.sql"),
  "utf8",
);

const countriesQuery = await readFile(join(etlPath, "countries.sql"), "utf8");

const labelsQuery = await readFile(join(etlPath, "labels.sql"), "utf8");

const auth = Buffer.from(`${username}:${password}`).toString("base64");

export async function runReleaseWorker(options: ReleaseWorkerOptions) {
  const { workerId, startId, endId, batchSize } = options;

  const sql = postgres(musicbrainzUrl!);

  let lastId = startId;
  let totalIndexed = 0;

  logger.info(
    {
      workerId,
      startId,
      endId,
      batchSize,
      index,
    },
    "Release worker started",
  );

  try {
    while (lastId < endId) {
      logger.info(
        {
          workerId,
          lastId,
          endId,
          totalIndexed,
          batchSize,
        },
        "Fetching release batch",
      );

      const rows = await sql.unsafe<ReleaseRow[]>(releasesQuery, [
        lastId,
        endId,
        batchSize,
      ]);

      if (rows.length === 0) {
        logger.info(
          {
            workerId,
            lastId,
            totalIndexed,
          },
          "No more releases found",
        );

        break;
      }

      const releaseIds = rows.map((release) => release.id);

      const artistCreditIds = rows.map((release) => release.artist_credit);

      const artistCredits = await sql.unsafe<ArtistCreditRow[]>(
        artistCreditsQuery,
        [artistCreditIds],
      );

      const countries = await sql.unsafe<CountryRow[]>(countriesQuery, [
        releaseIds,
      ]);

      const labels = await sql.unsafe<LabelRow[]>(labelsQuery, [releaseIds]);

      // Group artist credits by artist credit ID.
      const artistCreditsById = new Map<number, ArtistCreditRow[]>();

      for (const artistCredit of artistCredits) {
        const current = artistCreditsById.get(artistCredit.artist_credit) ?? [];

        current.push(artistCredit);

        artistCreditsById.set(artistCredit.artist_credit, current);
      }

      // Group countries by release ID.
      const countriesByRelease = new Map<number, CountryRow[]>();

      for (const country of countries) {
        const current = countriesByRelease.get(country.release) ?? [];

        current.push(country);

        countriesByRelease.set(country.release, current);
      }

      // Group labels by release ID.
      const labelsByRelease = new Map<number, LabelRow[]>();

      for (const label of labels) {
        const current = labelsByRelease.get(label.release) ?? [];

        current.push(label);

        labelsByRelease.set(label.release, current);
      }

      const documents: ReleaseDocument[] = rows.map((release) => {
        const credits = artistCreditsById.get(release.artist_credit) ?? [];

        const releaseCountries = countriesByRelease.get(release.id) ?? [];

        const releaseLabels = labelsByRelease.get(release.id) ?? [];

        const firstCountry = releaseCountries[0];

        return {
          mbid: release.mbid,
          name: release.name,

          release_group: {
            mbid: release.release_group_mbid,
            name: release.release_group_name,
          },

          artist_credit: {
            display: credits
              .map((artist) => `${artist.artist_name}${artist.join_phrase}`)
              .join(""),

            artists: credits.map((artist) => ({
              mbid: artist.artist_mbid,
              name: artist.artist_name,
              position: artist.position,
            })),
          },

          status: release.status_name,
          packaging: release.packaging_name,

          countries: releaseCountries.map((country) => ({
            mbid: country.country_mbid,
            name: country.country_name,
          })),

          date: {
            year: firstCountry?.date_year ?? null,
            month: firstCountry?.date_month ?? null,
            day: firstCountry?.date_day ?? null,
          },

          language: release.language
            ? {
                id: release.language,
                name: release.language_name!,
              }
            : null,

          script: release.script
            ? {
                id: release.script,
                name: release.script_name!,
              }
            : null,

          labels: releaseLabels.map((label) => ({
            mbid: label.label_mbid,
            name: label.label_name,
            catalog_number: label.catalog_number,
          })),

          barcode: release.barcode,

          cover_art: {
            has_cover: release.cover_art_presence !== "absent",
          },
        };
      });

      const body =
        documents
          .flatMap((release) => [
            JSON.stringify({
              index: {
                _index: index,
                _id: release.mbid,
              },
            }),
            JSON.stringify(release),
          ])
          .join("\n") + "\n";

      logger.info(
        {
          workerId,
          documents: documents.length,
        },
        "Indexing release batch",
      );

      const response = await fetch(`${opensearchUrl}/_bulk`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-ndjson",
        },
        body,
      });

      const responseText = await response.text();

      if (!response.ok) {
        logger.error(
          {
            workerId,
            status: response.status,
            response: responseText,
          },
          "OpenSearch bulk request failed",
        );

        throw new Error(`OpenSearch bulk request failed: ${response.status}`);
      }

      let responseBody: BulkResponse;

      try {
        responseBody = JSON.parse(responseText) as BulkResponse;
      } catch {
        logger.error(
          {
            workerId,
            response: responseText,
          },
          "Failed to parse OpenSearch bulk response",
        );

        throw new Error("Invalid OpenSearch bulk response");
      }

      if (responseBody.errors) {
        const errors = responseBody.items
          .filter((item) => item.index?.error)
          .slice(0, 5);

        logger.error(
          {
            workerId,
            errors,
          },
          "OpenSearch returned indexing errors",
        );

        throw new Error("One or more releases failed to index");
      }

      const lastRow = rows.at(-1);

      if (!lastRow) {
        break;
      }

      lastId = lastRow.id;
      totalIndexed += rows.length;

      logger.info(
        {
          workerId,
          batch: rows.length,
          totalIndexed,
          lastId,
        },
        "Release batch indexed successfully",
      );
    }

    logger.info(
      {
        workerId,
        totalIndexed,
        lastId,
        startId,
        endId,
      },
      "Release worker completed",
    );

    return {
      workerId,
      totalIndexed,
      lastId,
    };
  } catch (error) {
    logger.error(
      {
        workerId,
        error,
        totalIndexed,
        lastId,
      },
      "Release worker failed",
    );

    throw error;
  } finally {
    await sql.end();
  }
}
