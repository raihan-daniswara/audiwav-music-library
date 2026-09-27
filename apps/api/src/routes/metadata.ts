import { Hono } from "hono";
import { z } from "zod";

import {
  MetadataDetailService,
  MetadataSearchService,
} from "../services/metadata";

const metadataQuerySchema = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().max(50).optional(),
  country: z.string().trim().min(2).max(2).optional(),
  // Type filter default 'track' to mimic the original behavior but flexible
  type: z.enum(["track", "artist", "album"]).optional().default("track"),
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
    type: c.req.query("type"),
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

  const { q, limit, country, type } = parsed.data;
  
  // Instance murni tanpa injeksi canonical
  const service = new MetadataSearchService();

  if (type === "artist") {
     const results = await service.searchArtistsRaw(q, limit);
     return c.json({ results });
  }

  if (type === "album") {
     const results = await service.searchAlbumsRaw(q, limit);
     return c.json({ results });
  }

  // Jika type === "track" atau default
  const results = await service.search(q, {
    limit,
    country,
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
      sources: ["opensearch"], // Label sumber berubah dari canonical ke opensearch
    },
    { country: parsed.data.country },
  );

  return c.json({
    result: enriched,
  });
});
