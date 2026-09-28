import postgres from "postgres";

export const mbClient = postgres(process.env.MUSICBRAINZ_DATABASE_URL || "", {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});
