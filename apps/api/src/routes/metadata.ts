import { Hono } from "hono";
import { z } from "zod";

import { MetadataSearchService } from "../services/metadata";

import { getCanonicalClient } from "../config/metadata";

const metadataQuerySchema = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().max(50).optional(),
  country: z.string().trim().min(2).max(2).optional(),
});

export const metadataRoute = new Hono();

metadataRoute.get("/search", async (c) => {
  const parsed = metadataQuerySchema.safeParse({
    q: c.req.query("q"),
    limit: c.req.query("limit"),
    country: c.req.query("country"),
  });

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid query parameters",
        issues: parsed.error.issues,
      },
      400,
    );
  }

  const service = new MetadataSearchService({
    canonical: getCanonicalClient(),
  });

  const results = await service.search(parsed.data.q, {
    limit: parsed.data.limit,
    country: parsed.data.country,
  });

  return c.json({
    results,
  });
});
