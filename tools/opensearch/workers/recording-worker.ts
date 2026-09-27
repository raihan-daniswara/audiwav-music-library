import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { logger } from "@audiwav/logger";
import postgres from "postgres";

export type RecordingWorkerOptions = {
  workerId: number;
  startId: number;
  endId: number;
  batchSize: number;
};

type RecordingRow = {
  id: number;
  gid: string;
  name: string;
  length: number | null;
  artist_credit: number;
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
  recording: number;
  name: string;
};

type IsrcRow = {
  recording: number;
  isrc: string;
};

type TagRow = {
  recording: number;
  id: number;
  name: string;
};

type AlbumRow = {
  recording_id: number;
  release_mbid: string;
  release_name: string;
  release_group_mbid: string;
  cover_art_presence: string | null;
};

type AlbumDocument = {
  name: string;
  release_group_mbid?: string;
  artwork_url?: string;
};

type ArtistCredit = {
  display: string;
  artists: {
    mbid: string;
    name: string;
    position: number;
  }[];
};

type RecordingDocument = {
  mbid: string;
  title: string;
  duration_ms: number | null;
  album?: AlbumDocument | null;
  artist_credit: ArtistCredit;
  aliases: {
    name: string;
  }[];
  isrc: string[];
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
      error?: {
        type: string;
        reason: string;
      };
    };
  }[];
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

const index = "audiwav_recordings";

// Resolve ETL files relative to this worker file.
const workerDir = dirname(fileURLToPath(import.meta.url));
const etlPath = join(workerDir, "../etl/recordings");

const [
  recordingsQuery,
  artistCreditsQuery,
  aliasesQuery,
  isrcQuery,
  tagsQuery,
  albumsQuery,
] = await Promise.all([
  readFile(join(etlPath, "recordings.sql"), "utf8"),
  readFile(join(etlPath, "artist-credits.sql"), "utf8"),
  readFile(join(etlPath, "aliases.sql"), "utf8"),
  readFile(join(etlPath, "isrc.sql"), "utf8"),
  readFile(join(etlPath, "tags.sql"), "utf8"),
  readFile(join(etlPath, "albums.sql"), "utf8"),
]);

const auth = Buffer.from(`${username}:${password}`).toString("base64");

export async function runRecordingWorker({
  workerId,
  startId,
  endId,
  batchSize,
}: RecordingWorkerOptions) {
  const sql = postgres(musicbrainzUrl!);

  let lastId = startId;
  let totalIndexed = 0;

  logger.info(
    {
      workerId,
      startId,
      endId,
      batchSize,
    },
    "Recording worker started",
  );

  try {
    while (lastId < endId) {
      const fetchStartedAt = performance.now();

      const recordings = await sql.unsafe<RecordingRow[]>(recordingsQuery, [
        lastId,
        endId,
        batchSize,
      ]);

      if (recordings.length === 0) {
        logger.info(
          {
            workerId,
            lastId,
          },
          "No more recordings found",
        );

        break;
      }

      const recordingIds = recordings.map((r) => r.id);
      const artistCreditIds = Array.from(
        new Set(recordings.map((r) => r.artist_credit)),
      );

      const [artistCreditsRaw, aliasesRaw, isrcsRaw, tagsRaw, albumsRaw] =
        await Promise.all([
          sql.unsafe<ArtistCreditRow[]>(artistCreditsQuery, [
            artistCreditIds as any,
          ]),
          sql.unsafe<AliasRow[]>(aliasesQuery, [recordingIds as any]),
          sql.unsafe<IsrcRow[]>(isrcQuery, [recordingIds as any]),
          sql.unsafe<TagRow[]>(tagsQuery, [recordingIds as any]),
          sql.unsafe<AlbumRow[]>(albumsQuery, [recordingIds as any]),
        ]);

      const artistCreditsMap = new Map<number, ArtistCredit>();
      for (const id of artistCreditIds) {
        const rows = artistCreditsRaw
          .filter((r) => r.artist_credit === id)
          .sort((a, b) => a.position - b.position);

        let display = "";
        rows.forEach((r) => {
          display += r.artist_name + (r.join_phrase || "");
        });

        artistCreditsMap.set(id, {
          display,
          artists: rows.map((r) => ({
            mbid: r.artist_mbid,
            name: r.artist_name,
            position: r.position,
          })),
        });
      }

      const aliasesMap = new Map<number, { name: string }[]>();
      for (const row of aliasesRaw) {
        if (!aliasesMap.has(row.recording)) aliasesMap.set(row.recording, []);
        aliasesMap.get(row.recording)!.push({ name: row.name });
      }

      const isrcsMap = new Map<number, string[]>();
      for (const row of isrcsRaw) {
        if (!isrcsMap.has(row.recording)) isrcsMap.set(row.recording, []);
        isrcsMap.get(row.recording)!.push(row.isrc);
      }

      const tagsMap = new Map<number, { id: number; name: string }[]>();
      for (const row of tagsRaw) {
        if (!tagsMap.has(row.recording)) tagsMap.set(row.recording, []);
        tagsMap.get(row.recording)!.push({ id: row.id, name: row.name });
      }

      const albumsMap = new Map<number, AlbumDocument>();
      for (const row of albumsRaw) {
        albumsMap.set(row.recording_id, {
          name: row.release_name,
          release_group_mbid: row.release_group_mbid,
          artwork_url:
            row.cover_art_presence === "present"
              ? `https://coverartarchive.org/release-group/${row.release_group_mbid}/front-250`
              : undefined,
        });
      }

      const body =
        recordings
          .flatMap((recording) => {
            const doc: RecordingDocument = {
              mbid: recording.gid,
              title: recording.name,
              duration_ms: recording.length,
              album: albumsMap.get(recording.id) || null,
              rating: recording.rating ?? 0,
              rating_count: recording.rating_count ?? 0,
              artist_credit: artistCreditsMap.get(recording.artist_credit) || {
                display: "",
                artists: [],
              },
              aliases: aliasesMap.get(recording.id) || [],
              isrc: isrcsMap.get(recording.id) || [],
              tags: tagsMap.get(recording.id) || [],
            };
            return [
              JSON.stringify({ index: { _index: index, _id: recording.gid } }),
              JSON.stringify(doc),
            ];
          })
          .join("\n") + "\n";

      logger.info(
        {
          workerId,
          lastId,
          documents: recordings.length,
        },
        "Indexing recording batch",
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

        throw new Error(
          `OpenSearch bulk error ${response.status}: ${responseText}`,
        );
      }

      const result: BulkResponse = JSON.parse(responseText);

      if (result.errors) {
        const errorItem = result.items.find(
          (item) => item.index?.error !== undefined,
        );

        logger.error(
          {
            workerId,
            error: errorItem?.index?.error,
          },
          "OpenSearch bulk indexing had errors",
        );

        throw new Error(
          `OpenSearch indexing error: ${errorItem?.index?.error?.reason}`,
        );
      }

      totalIndexed += recordings.length;
      lastId = recordings[recordings.length - 1]!.id;

      const duration = performance.now() - fetchStartedAt;

      logger.info(
        {
          workerId,
          lastId,
          totalIndexed,
          durationMs: Math.round(duration),
        },
        "Recording batch indexed successfully",
      );
    }

    logger.info(
      {
        workerId,
        totalIndexed,
      },
      "Recording worker completed",
    );

    return {
      workerId,
      totalIndexed,
      lastId,
    };
  } finally {
    await sql.end();
  }
}
