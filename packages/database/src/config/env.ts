const databaseUrl = Bun.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

export const env = {
  DATABASE_URL: databaseUrl,
} as const;