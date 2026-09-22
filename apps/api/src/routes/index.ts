import { Hono } from "hono";

import { healthRoute } from "./health";
import { metadataRoute } from "./metadata";
import { lyricsRoute } from "./lyrics";
import { musicRoute } from "./music";

export const routes = new Hono();

routes.route("/health", healthRoute);
routes.route("/metadata", metadataRoute);
routes.route("/lyrics", lyricsRoute);
routes.route("/music", musicRoute);
