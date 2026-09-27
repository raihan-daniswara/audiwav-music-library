import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import postgres from "postgres";

import { logger } from "@audiwav/logger";

type ReleaseGroupRow = {
  id: number;
  mbid: string;
  name: string;
  artist_credit: number;
  type: string | null;
  rating: number | null;
  rating_count: number | null;
};

type ArtistCreditRow = {
  artist_credit: number;
  position: number;
  join_phrase: string;
  artist_mbid: string;
  artist_name: string;
};

type AliasRow = {
  release_group: number;
  name: string;
};

type TagRow = {
  release_group: number;
  id: number;
  name: string;
};

type ReleaseGroupDocument = {
  mbid: string;
  name: string;
  type: string | null;
  artist_credit: {
    display: string;
    artists: {
      mbid: string;
      name: string;
      position: number;
    }[];
  };
  aliases: {
    name: string;
  }[];
  rating: number;
  rating_count: number;
  tags: {
    id: number;
    name: string;
  }[];
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

export type ReleaseGroupWorkerOptions = {
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

const index = "audiwav_release_groups";

const workerDir = dirname(fileURLToPath(import.meta.url));
const etlPath = join(workerDir, "../etl/release-groups");

const releaseGroupsQuery = await readFile(
  join(etlPath, "release-groups.sql"),
  "utf8",
);

const artistCreditsQuery = await readFile(
  join(etlPath, "artist-credits.sql"),
  "utf8",
);

const aliasesQuery = await readFile(join(etlPath, "aliases.sql"), "utf8");

const tagsQuery = await readFile(join(etlPath, "tags.sql"), "utf8");

const auth = Buffer.from(`${username}:${password}`).toString("base64");

export async function runReleaseGroupWorker(
  options: ReleaseGroupWorkerOptions,
) {
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
    "Release-group worker started",
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
        "Fetching release-group batch",
      );

      const rows = await sql.unsafe<ReleaseGroupRow[]>(releaseGroupsQuery, [
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
          "No more release-groups found",
        );

        break;
      }

      const releaseGroupIds = rows.map((releaseGroup) => releaseGroup.id);

      const artistCreditIds = rows.map(
        (releaseGroup) => releaseGroup.artist_credit,
      );

      const artistCredits = await sql.unsafe<ArtistCreditRow[]>(
        artistCreditsQuery,
        [artistCreditIds],
      );

      const aliases = await sql.unsafe<AliasRow[]>(aliasesQuery, [
        releaseGroupIds,
      ]);

      const tags = await sql.unsafe<TagRow[]>(tagsQuery, [releaseGroupIds]);

      // Group artist credits by MusicBrainz artist credit ID.
      const artistCreditsById = new Map<number, ArtistCreditRow[]>();

      for (const artistCredit of artistCredits) {
        const current = artistCreditsById.get(artistCredit.artist_credit) ?? [];

        current.push(artistCredit);

        artistCreditsById.set(artistCredit.artist_credit, current);
      }

      // Group aliases by MusicBrainz release-group ID.
      const aliasesByReleaseGroup = new Map<number, AliasRow[]>();

      for (const alias of aliases) {
        const current = aliasesByReleaseGroup.get(alias.release_group) ?? [];

        current.push(alias);

        aliasesByReleaseGroup.set(alias.release_group, current);
      }

      // Group tags by MusicBrainz release-group ID.
      const tagsByReleaseGroup = new Map<number, TagRow[]>();

      for (const tag of tags) {
        const current = tagsByReleaseGroup.get(tag.release_group) ?? [];

        current.push(tag);

        tagsByReleaseGroup.set(tag.release_group, current);
      }

      const documents: ReleaseGroupDocument[] = rows.map((releaseGroup) => {
        const credits = artistCreditsById.get(releaseGroup.artist_credit) ?? [];

        return {
          mbid: releaseGroup.mbid,
          name: releaseGroup.name,
          type: releaseGroup.type,
          rating: releaseGroup.rating ?? 0,
          rating_count: releaseGroup.rating_count ?? 0,

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

          aliases: (aliasesByReleaseGroup.get(releaseGroup.id) ?? []).map(
            (alias) => ({
              name: alias.name,
            }),
          ),

          tags: (tagsByReleaseGroup.get(releaseGroup.id) ?? []).map((tag) => ({
            id: tag.id,
            name: tag.name,
          })),
        };
      });

      const body =
        documents
          .flatMap((releaseGroup) => [
            JSON.stringify({
              index: {
                _index: index,
                _id: releaseGroup.mbid,
              },
            }),
            JSON.stringify(releaseGroup),
          ])
          .join("\n") + "\n";

      logger.info(
        {
          workerId,
          documents: documents.length,
        },
        "Indexing release-group batch",
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

        throw new Error("One or more release-groups failed to index");
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
        "Release-group batch indexed successfully",
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
      "Release-group worker completed",
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
      "Release-group worker failed",
    );

    throw error;
  } finally {
    await sql.end();
  }
}
