import { Hono } from "hono";
import { z } from "zod";

import {
  MetadataDetailService,
  MetadataSearchService,
} from "../services/metadata";

import { getCanonicalClient } from "../config/metadata";

const metadataQuerySchema = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().max(50).optional(),
  country: z.string().trim().min(2).max(2).optional(),
});

const metadataDetailSchema = z.object({
  title: z.string().trim().min(1),
  artist: z.string().trim().min(1),
  album: z.string().trim().optional().default(""),
  recordingMbid: z.string().trim().optional(),
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

metadataRoute.post("/detail", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = metadataDetailSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid metadata payload",
        issues: parsed.error.issues,
      },
      400,
    );
  }

  const detailService = new MetadataDetailService();
  const enriched = await detailService.getDetail(
    {
      title: parsed.data.title,
      artist: parsed.data.artist,
      album: parsed.data.album,
      recordingMbid: parsed.data.recordingMbid,
      sources: ["canonical"],
    },
    { country: parsed.data.country },
  );

  return c.json({
    result: enriched,
  });
});
