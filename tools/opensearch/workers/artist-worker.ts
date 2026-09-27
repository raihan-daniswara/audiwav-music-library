import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import postgres from "postgres";

import { logger } from "@audiwav/logger";

type ArtistRow = {
  id: number;
  gid: string;
  name: string;
  sort_name: string;
  rating: number | null;
  rating_count: number | null;
};

type AliasRow = {
  artist: number;
  name: string;
};

type TagRow = {
  artist: number;
  id: number;
  name: string;
};

type ArtistDocument = {
  mbid: string;
  name: string;
  sort_name: string;
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

export type ArtistWorkerOptions = {
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

const index = "audiwav_artists";

const workerDir = dirname(fileURLToPath(import.meta.url));
const etlPath = join(workerDir, "../etl/artists");

const artistsQuery = await readFile(join(etlPath, "artists.sql"), "utf8");

const aliasesQuery = await readFile(join(etlPath, "aliases.sql"), "utf8");

const tagsQuery = await readFile(join(etlPath, "tags.sql"), "utf8");

const auth = Buffer.from(`${username}:${password}`).toString("base64");

export async function runArtistWorker(options: ArtistWorkerOptions) {
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
    "Artist worker started",
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
        "Fetching artist batch",
      );

      const rows = await sql.unsafe<ArtistRow[]>(artistsQuery, [
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
          "No more artists found",
        );

        break;
      }

      const artistIds = rows.map((artist) => artist.id);

      const aliases = await sql.unsafe<AliasRow[]>(aliasesQuery, [artistIds]);

      const tags = await sql.unsafe<TagRow[]>(tagsQuery, [artistIds]);

      // Group aliases by MusicBrainz artist ID.
      const aliasesByArtist = new Map<number, AliasRow[]>();

      for (const alias of aliases) {
        const current = aliasesByArtist.get(alias.artist) ?? [];

        current.push(alias);

        aliasesByArtist.set(alias.artist, current);
      }

      // Group tags by MusicBrainz artist ID.
      const tagsByArtist = new Map<number, TagRow[]>();

      for (const tag of tags) {
        const current = tagsByArtist.get(tag.artist) ?? [];

        current.push(tag);

        tagsByArtist.set(tag.artist, current);
      }

      const documents: ArtistDocument[] = rows.map((artist) => ({
        mbid: artist.gid,
        name: artist.name,
        sort_name: artist.sort_name,
        rating: artist.rating ?? 0,
        rating_count: artist.rating_count ?? 0,

        aliases: (aliasesByArtist.get(artist.id) ?? []).map((alias) => ({
          name: alias.name,
        })),

        tags: (tagsByArtist.get(artist.id) ?? []).map((tag) => ({
          id: tag.id,
          name: tag.name,
        })),
      }));

      const body =
        documents
          .flatMap((artist) => [
            JSON.stringify({
              index: {
                _index: index,
                _id: artist.mbid,
              },
            }),

            JSON.stringify(artist),
          ])
          .join("\n") + "\n";

      logger.info(
        {
          workerId,
          documents: documents.length,
        },
        "Indexing artist batch",
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

        throw new Error("One or more artists failed to index");
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
        "Artist batch indexed successfully",
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
      "Artist worker completed",
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
      "Artist worker failed",
    );

    throw error;
  } finally {
    await sql.end();
  }
}
