import { Hono } from "hono";
import { z } from "zod";

import {
  SongDetailService,
  AlbumDetailService,
  ArtistDetailService,
  MetadataSearchService,
} from "../services/metadata";
import { getArtistImageFromWiki } from "../services/metadata/wikimedia/query";

const metadataQuerySchema = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().max(50).optional(),
  country: z.string().trim().min(2).max(2).optional(),
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

metadataRoute.get("/artist/artwork", async (c) => {
  const mbid = c.req.query("mbid");
  if (!mbid) {
    return c.json({ url: null }, 400);
  }

  const url = await getArtistImageFromWiki(mbid);
  return c.json({ url });
});

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

  const searchOpts = {
    limit,
    country,
    type,
    sources: ["opensearch"] as const,
  };

  const result = await service.search(q, searchOpts);

  return c.json({
    result,
  });
});

// PENTING: Kembalikan path endpoint menjadi /song/detail agar Frontend tidak 404
metadataRoute.post("/song/detail", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = metadataDetailSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid payload",
        issues: parsed.error.issues,
      },
      400,
    );
  }

  const detailService = new SongDetailService();
  const enriched = await detailService.getDetail(
    {
      title: parsed.data.title,
      artist: parsed.data.artist,
      album: parsed.data.album,
      recordingMbid: parsed.data.recordingMbid,
      sources: ["opensearch"], 
    },
    { country: parsed.data.country },
  );

  return c.json({
    result: enriched,
  });
});

metadataRoute.get("/album/detail/:mbid", async (c) => {
  const mbid = c.req.param("mbid");
  
  if (!mbid || mbid.trim() === "") {
    return c.json({ error: "Missing album MBID" }, 400);
  }

  const detailService = new AlbumDetailService();
  const result = await detailService.getAlbumDetail(mbid);

  if ('error' in result) {
    return c.json(result, 404);
  }

  return c.json({ result });
});

metadataRoute.get("/artist/detail/:mbid", async (c) => {
  const mbid = c.req.param("mbid");
  
  if (!mbid || mbid.trim() === "") {
    return c.json({ error: "Missing artist MBID" }, 400);
  }

  const detailService = new ArtistDetailService();
  const result = await detailService.getArtistDetail(mbid);

  if ('error' in result) {
    return c.json(result, 404);
  }

  return c.json({ result });
});
