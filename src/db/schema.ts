// Drizzle schema — the source of truth for the data model.
//
// Workflow: edit this file → `npm run db:generate` → review the generated SQL
// in supabase/migrations/ → `npm run db:migrate`.
//
// Tables are added per feature (see CLAUDE.md); the schema stays central
// because tables cross feature boundaries.

import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// User settings, one row per auth user, created lazily on first save.
// user_id references auth.users(id); the FK + RLS policies live in a custom
// migration because Drizzle does not manage the Supabase-owned auth schema.
export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  twitterHandle: text("twitter_handle"),
  blueskyHandle: text("bluesky_handle"),
  origin: text("origin"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
