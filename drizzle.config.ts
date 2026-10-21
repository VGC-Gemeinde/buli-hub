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
  // The chain restarted from a new baseline when the hub left Supabase
  // (specs/004-google-cloud-migration, research.md R6); append-only from there.
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
