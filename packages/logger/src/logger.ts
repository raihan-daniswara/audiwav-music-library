import pino from "pino";

export const logger = pino({
  // Level default bisa diubah lewat environment variable.
  level: process.env.LOG_LEVEL ?? "info",

  // Menambahkan identitas service pada setiap log.
  base: {
    service: process.env.SERVICE_NAME ?? "audiwav",
  },

  // Mencegah data sensitif ikut masuk ke log.
  redact: {
    paths: [
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "cookie",
      "apiKey",
      "*.password",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.authorization",
      "*.cookie",
      "*.apiKey",
    ],
    censor: "[REDACTED]",
  },
});
