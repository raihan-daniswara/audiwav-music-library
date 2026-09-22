import { Hono } from "hono";
import { z } from "zod";

import { LyricsService } from "../services/lyrics";
import { getLyricFinder } from "../config/lyrics";

const lyricsQuerySchema = z.object({
  title: z.string().trim().min(1),
  artist: z.string().trim().min(1),
  album: z.string().trim().optional(),
  duration: z.coerce.number().positive().optional(),
});

export const lyricsRoute = new Hono();

lyricsRoute.get("/search", async (c) => {
  const parsed = lyricsQuerySchema.safeParse({
    title: c.req.query("title"),
    artist: c.req.query("artist"),
    album: c.req.query("album"),
    duration: c.req.query("duration"),
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

  const service = new LyricsService({
    finder: getLyricFinder(),
  });

  const result = await service.getLyrics({
    title: parsed.data.title,
    artist: parsed.data.artist,
    album: parsed.data.album,
    duration: parsed.data.duration,
  });

  if (!result) {
    return c.json({ error: "Lyrics not found" }, 404);
  }

  return c.json({
    result,
  });
});
