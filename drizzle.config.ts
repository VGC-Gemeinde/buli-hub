import { defineConfig } from "drizzle-kit";

// drizzle-kit does not load env files on its own.
try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional; DATABASE_URL may come from the environment.
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set (see .env.example)");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  // Migrations live in supabase/migrations with timestamp-prefixed names so
  // `supabase db reset` replays them alongside drizzle-kit migrate.
  out: "./supabase/migrations",
  migrations: {
    prefix: "supabase",
  },
  dbCredentials: {
    url: databaseUrl,
  },
});
