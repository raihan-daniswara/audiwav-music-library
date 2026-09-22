import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  HOST: z.string().default("0.0.0.0"),

  CANONICAL_DATABASE_URL: z.string().min(1),

  // Storage / RustFS Configs
  RUSTFS_ACCESS_KEY: z.string().min(1),
  RUSTFS_SECRET_KEY: z.string().min(1),
  
  // Slskd config
  SLSKD_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
