import { serve } from "bun";

import { app } from "./app";
import { env } from "./config/env";

serve({
  fetch: app.fetch,
  hostname: env.HOST,
  port: env.PORT,
});

console.log(`Audiwav API running at http://localhost:${env.PORT}`);
