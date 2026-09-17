import postgres from "postgres";

const databaseUrl = Bun.env.MUSICBRAINZ_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("MUSICBRAINZ_DATABASE_URL is not defined");
}

export const canonicalDb = postgres(databaseUrl);
