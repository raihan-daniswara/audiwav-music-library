import { runArtistWorker } from "./artist-worker";
import { runRecordingWorker } from "./recording-worker";
import { runReleaseGroupWorker } from "./release-group-worker";
import { runReleaseWorker } from "./release-worker";
import { runPool, type PoolTable } from "./pool";

const entity = Bun.argv[2];

if (!entity) {
  throw new Error(
    "Missing entity. Usage: bun index.ts artist | bun index.ts recording | bun index.ts release-group",
  );
}

if (
  entity !== "artist" &&
  entity !== "recording" &&
  entity !== "release-group" &&
  entity !== "release"
) {
  throw new Error(
    `Unknown entity "${entity}". Available entities: artist, recording, release-group, release`,
  );
}

const table = entity as PoolTable;

const worker =
  table === "artist"
    ? runArtistWorker
    : table === "recording"
      ? runRecordingWorker
      : table === "release-group"
        ? runReleaseGroupWorker
        : runReleaseWorker;

await runPool({
  table,
  worker,
});
