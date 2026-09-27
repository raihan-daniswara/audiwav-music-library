import { logger } from "@audiwav/logger";

const opensearchUrl = process.env.OPENSEARCH_URL;
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;

if (!opensearchUrl || !username || !password) {
  logger.error("Missing OpenSearch environment variables");
  process.exit(1);
}

const auth = Buffer.from(`${username}:${password}`).toString("base64");

const entity = Bun.argv[2];

if (!entity) {
  throw new Error(
    "Missing entity. Usage: bun delete-index.ts <artist|recording|release-group|release|all>",
  );
}

const entityMap: Record<string, string> = {
  "artist": "audiwav_artists",
  "recording": "audiwav_recordings",
  "release-group": "audiwav_release_groups",
  "release": "audiwav_releases"
};

let indicesToDelete: string[] = [];

if (entity === "all") {
  indicesToDelete = Object.values(entityMap);
} else {
  if (!entityMap[entity]) {
    throw new Error(`Unknown entity: ${entity}`);
  }
  indicesToDelete.push(entityMap[entity]);
}

for (const index of indicesToDelete) {
  try {
    const response = await fetch(`${opensearchUrl}/${index}`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (response.status === 404) {
      logger.info({ index }, "Index not found (already deleted)");
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      logger.error(
        { index, status: response.status, response: body },
        "Failed to delete index"
      );
      continue;
    }

    logger.info({ index }, "OpenSearch index deleted successfully");
  } catch (error) {
    logger.error({ error, index }, "Request to delete OpenSearch index failed");
  }
}
