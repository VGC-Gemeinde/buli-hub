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
const client = postgres(databaseUrl, { prepare: false });

export const db = drizzle(client, { schema });
