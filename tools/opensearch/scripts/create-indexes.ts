import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { logger } from "@audiwav/logger";

const opensearchUrl = process.env.OPENSEARCH_URL;
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;

if (!opensearchUrl || !username || !password) {
  logger.error("Missing OpenSearch environment variables");
  process.exit(1);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));

const indexes = [
  {
    index: "audiwav_artists",
    mapping: "artists.json",
  },
  {
    index: "audiwav_recordings",
    mapping: "recordings.json",
  },
  {
    index: "audiwav_release_groups",
    mapping: "release-groups.json",
  },
  {
    index: "audiwav_releases",
    mapping: "releases.json",
  },
];

const auth = Buffer.from(`${username}:${password}`).toString("base64");

for (const { index, mapping: mappingFile } of indexes) {
  try {
    const existsResponse = await fetch(`${opensearchUrl}/${index}`, {
      method: "HEAD",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (existsResponse.ok) {
      logger.info({ index }, "OpenSearch index already exists, skipping");
      continue;
    }

    if (existsResponse.status !== 404) {
      const body = await existsResponse.text();

      logger.error(
        {
          index,
          status: existsResponse.status,
          response: body,
        },
        "Failed to check OpenSearch index",
      );

      process.exit(1);
    }

    const mappingPath = join(scriptDir, "../mappings", mappingFile);

    const mapping = await readFile(mappingPath, "utf8");

    logger.info({ index }, "Creating OpenSearch index");

    const response = await fetch(`${opensearchUrl}/${index}`, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: mapping,
    });

    const body = await response.text();

    if (!response.ok) {
      logger.error(
        {
          index,
          status: response.status,
          response: body,
        },
        "Failed to create OpenSearch index",
      );

      process.exit(1);
    }

    logger.info({ index }, "OpenSearch index created successfully");
  } catch (error) {
    logger.error(
      {
        error,
        index,
      },
      "Failed to create OpenSearch index",
    );

    process.exit(1);
  }
}
