import postgres from "postgres";

import { env } from "./config/env";

const sql = postgres(env.DATABASE_URL);

const result = await sql`SELECT version()`;

console.log(result[0]);

await sql.end();
