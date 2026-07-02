// Drizzle schema — the source of truth for the data model.
//
// Workflow: edit this file → `npm run db:generate` → review the generated SQL
// in supabase/migrations/ → `npm run db:migrate`.
//
// Tables are added per feature (see CLAUDE.md); the schema stays central
// because tables cross feature boundaries.

import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// App role, derived from the user's Discord guild roles (highest wins).
export const roleEnum = pgEnum("role", ["dev", "admin", "staff", "player"]);

// User settings, one row per auth user, created lazily on first save or
// first role sync. user_id references auth.users(id); the FK + RLS policies
// and the column-level grants for the server-managed role columns live in
// custom migrations because Drizzle does not express them.
export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  twitterHandle: text("twitter_handle"),
  blueskyHandle: text("bluesky_handle"),
  origin: text("origin"),
  role: roleEnum("role").notNull().default("player"),
  roleSyncedAt: timestamp("role_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
