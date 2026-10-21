// Rebuilds the local database from the committed migrations: drops the
// `public` and `drizzle` schemas, recreates `public` and runs drizzle-kit
// migrate. Replaces `supabase db reset` (specs/004-google-cloud-migration).
//
//   npm run db:reset
//
// Refuses anything but the local compose stack, with the same guard the test
// suite uses, so a production string in DATABASE_URL cannot be wiped here.

import { execFileSync } from "node:child_process";
import postgres from "postgres";
import { localDatabaseError } from "../src/test/local-database.ts";

try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional; DATABASE_URL may come from the environment.
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set (see .env.example)");
  process.exit(1);
}
const guard = localDatabaseError(databaseUrl);
if (guard) {
  console.error(guard.replace("Refusing to run tests", "Refusing to reset"));
  process.exit(1);
}

const sql = postgres(databaseUrl, { onnotice: () => {} });
try {
  await sql`drop schema if exists drizzle cascade`;
  await sql`drop schema if exists public cascade`;
  await sql`create schema public`;
} finally {
  await sql.end();
}

execFileSync("npx", ["drizzle-kit", "migrate"], { stdio: "inherit" });
console.log("Local database rebuilt from drizzle/.");
