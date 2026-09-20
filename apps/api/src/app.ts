import { Hono } from "hono";

import { routes } from "./routes";

export const app = new Hono();

app.route("/api", routes);
