import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  HOST: z.string().default("0.0.0.0"),

  CANONICAL_DATABASE_URL: z.string().min(1),
});

export const env = envSchema.parse(process.env);
