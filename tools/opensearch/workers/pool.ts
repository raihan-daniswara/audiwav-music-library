import postgres from "postgres";

type WorkerOptions = {
  workerId: number;
  startId: number;
  endId: number;
  batchSize: number;
};

type WorkerResult = {
  workerId: number;
  totalIndexed: number;
  lastId: number;
};

type WorkerFunction = (options: WorkerOptions) => Promise<WorkerResult>;

export type PoolTable = "artist" | "recording" | "release-group" | "release";

type RunPoolOptions = {
  table: PoolTable;
  worker: WorkerFunction;
  workerCount?: number;
  batchSize?: number;
};

const musicbrainzUrl = process.env.MUSICBRAINZ_DATABASE_URL;

if (!musicbrainzUrl) {
  throw new Error("Missing MUSICBRAINZ_DATABASE_URL");
}

// Only allow tables that are explicitly supported by the pool.
const rangeQueries: Record<PoolTable, string> = {
  artist: `
    SELECT
      MIN(id) AS min_id,
      MAX(id) AS max_id
    FROM artist
  `,

  recording: `
    SELECT
      MIN(id) AS min_id,
      MAX(id) AS max_id
    FROM recording
  `,

  "release-group": `
    SELECT
      MIN(id) AS min_id,
      MAX(id) AS max_id
    FROM release_group
  `,

  release: `
    SELECT
      MIN(id) AS min_id,
      MAX(id) AS max_id
    FROM release
  `,
};

export async function runPool({
  table,
  worker,
  workerCount = 10,
  batchSize = 2500,
}: RunPoolOptions) {
  const sql = postgres(musicbrainzUrl!);

  const rows = await sql.unsafe<
    {
      min_id: number | null;
      max_id: number | null;
    }[]
  >(rangeQueries[table]);

  await sql.end();

  const minId = rows[0]?.min_id ? Number(rows[0].min_id) : null;
  const maxId = rows[0]?.max_id ? Number(rows[0].max_id) : null;

  if (minId === null || maxId === null) {
    throw new Error(`${table} table is empty`);
  }

  const totalIdRange = maxId - minId + 1;
  const rangeSize = Math.ceil(totalIdRange / workerCount);

  const ranges = Array.from({ length: workerCount }, (_, index) => {
    const rangeStart = minId + index * rangeSize;
    const rangeEnd = Math.min(rangeStart + rangeSize - 1, maxId);

    return {
      workerId: index + 1,

      // Worker query uses `id > startId`,
      // so subtract one to include rangeStart.
      startId: rangeStart - 1,
      endId: rangeEnd,
    };
  });

  console.log({
    table,
    minId,
    maxId,
    ranges,
  });

  const startedAt = performance.now();

  const results = await Promise.all(
    ranges.map((range) =>
      worker({
        ...range,
        batchSize,
      }),
    ),
  );

  const elapsedMs = Math.round(performance.now() - startedAt);

  const totalIndexed = results.reduce(
    (total, result) => total + result.totalIndexed,
    0,
  );

  console.log({
    table,
    results,
    totalIndexed,
    elapsedMs,
  });

  return {
    results,
    totalIndexed,
    elapsedMs,
  };
}
