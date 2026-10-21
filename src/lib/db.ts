import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set (see .env.example)");
}

// Connects directly to Postgres; authorization checks live in server code
// (see CLAUDE.md). On Cloud Run the connection goes through the Cloud SQL
// socket: postgres.js reaches a socket only through its `host` option (a host
// containing "/" becomes the socket directory), never through `?host=` in the
// URL, so DATABASE_SOCKET carries it separately. The pool is capped by
// DATABASE_POOL_MAX because production and staging share one small instance
// (specs/004-google-cloud-migration, research.md R1, R3).
//
// The client is cached on globalThis outside production: Next's dev server
// re-evaluates this module on hot reload, and a fresh pool per reload leaks
// connections until local Postgres runs out of slots (error 53300).
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};
const client =
  globalForDb.pgClient ??
  postgres(databaseUrl, {
    host: process.env.DATABASE_SOCKET || undefined,
    max: Number(process.env.DATABASE_POOL_MAX) || 10,
  });
if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
