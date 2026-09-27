import { Hono } from "hono";

import { healthRoute } from "./health";
import { metadataRoute } from "./metadata";
import { lyricsRoute } from "./lyrics";

export const routes = new Hono();

routes.route("/health", healthRoute);
routes.route("/metadata", metadataRoute);
routes.route("/lyrics", lyricsRoute);
