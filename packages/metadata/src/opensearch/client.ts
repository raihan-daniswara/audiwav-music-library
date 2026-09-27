import { Client } from "@opensearch-project/opensearch";

const opensearchUrl = process.env.OPENSEARCH_URL;
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;

if (!opensearchUrl || !username || !password) {
  throw new Error("Missing OpenSearch environment variables");
}

export const osClient = new Client({
  node: opensearchUrl,
  auth: {
    username,
    password,
  },
  ssl: {
    rejectUnauthorized: false
  }
});
