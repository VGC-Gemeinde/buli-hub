import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set (see .env.example)");
}

// Connects directly to Postgres, bypassing RLS — authorization checks live in
// server code (see CLAUDE.md). `prepare: false` keeps the client compatible
// with Supabase's transaction-mode pooler in production.
//
// The client is cached on globalThis outside production: Next's dev server
// re-evaluates this module on hot reload, and a fresh pool per reload leaks
// connections until local Postgres runs out of slots (error 53300).
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};
const client =
  globalForDb.pgClient ?? postgres(databaseUrl, { prepare: false });
if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
