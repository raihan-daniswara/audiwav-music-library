import { z } from "zod";

const envSchema = z.object({
  // Host dan Port untuk API server
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database MusicBrainz / Audiwav
  MUSICBRAINZ_DATABASE_URL: z.string().url(),

  // OpenSearch Configurations
  OPENSEARCH_URL: z.string().url(),
  OPENSEARCH_USERNAME: z.string().min(1).default("admin"),
  OPENSEARCH_PASSWORD: z.string().min(1).default("admin"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.message);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
