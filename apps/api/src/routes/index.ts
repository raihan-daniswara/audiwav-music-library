import { Hono } from "hono";

import { healthRoute } from "./health";
import { metadataRoute } from "./metadata";

export const routes = new Hono();

routes.route("/health", healthRoute);
routes.route("/metadata", metadataRoute);
