// Drizzle schema — the source of truth for the data model.
//
// Workflow: edit this file → `npm run db:generate` → review the generated SQL
// in supabase/migrations/ → `npm run db:migrate`.
//
// Tables are added per feature (see CLAUDE.md); the schema stays central
// because tables cross feature boundaries.

import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

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
  // Discord guild identity, server-managed (synced from the guild member,
  // JWT fallback for non-members). Nullable; null avatar → initials fallback.
  displayName: text("display_name"),
  username: text("username"),
  avatarUrl: text("avatar_url"),
  // Live capability, editable by the owner (not a per-season snapshot — see
  // docs/decisions/registration-vs-profile-data.md).
  hasCaptureCard: boolean("has_capture_card").notNull().default(false),
  // Set when the owner saves their settings (any change). Drives the
  // registration profile-hint; distinct from updatedAt, which the identity
  // sync also bumps.
  settingsEditedAt: timestamp("settings_edited_at", { withTimezone: true }),
  // Set when the owner dismisses the registration profile-hint.
  registrationHintDismissedAt: timestamp("registration_hint_dismissed_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Season registration window. A row exists only once staff has opened a
// registration; the current state (not started / open / closed) is derived
// from the latest row and the current time — there is no status column and
// no scheduled job. opened_by references auth.users (FK + RLS in a custom
// migration, since Drizzle does not manage the auth schema).
export const registrationWindows = pgTable("registration_windows", {
  id: uuid("id").primaryKey().defaultRandom(),
  openedAt: timestamp("opened_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  openedBy: uuid("opened_by").notNull(),
});

export const platformEnum = pgEnum("platform", ["showdown", "cartridge"]);
export const playerStatusEnum = pgEnum("player_status", ["returning", "new"]);

// One player's registration for one window. Status is resolved at submit time
// (detected-returning / self-reported veteran / new); the branch-specific
// columns are nullable and set only for the relevant status. FK + RLS live in
// a custom migration.
export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    windowId: uuid("window_id").notNull(),
    userId: uuid("user_id").notNull(),
    platform: platformEnum("platform").notNull(),
    status: playerStatusEnum("status").notNull(),
    // Self-report answer; null when detection settled the status.
    participatedBefore: boolean("participated_before"),
    // Veteran-history (self-reported veterans only).
    prevSeason: text("prev_season"),
    prevName: text("prev_name"),
    prevDivision: text("prev_division"),
    prevPlacement: text("prev_placement"),
    // New-player set.
    skillSelfRating: integer("skill_self_rating"),
    greatestAchievements: text("greatest_achievements"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.windowId, table.userId)],
);

// Division seeding for a season (anchored to its registration window). One
// seeding per window; holds the season-wide sub-division size and the publish
// state. Divisions/sub-divisions/placements hang off it. All FKs + RLS live in
// a custom migration (server-only, like the other staff tables).
export const seedings = pgTable("seedings", {
  windowId: uuid("window_id").primaryKey(),
  subDivisionSize: integer("sub_division_size").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// A division = a skill tier within a season (1 = top). Name is derived:
// „Division {tier}".
export const divisions = pgTable(
  "divisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    windowId: uuid("window_id").notNull(),
    tier: integer("tier").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.windowId, table.tier)],
);

// A sub-division = a round-robin group within a division. Name is derived from
// the division tier and the 0-based position → letter: „Division {tier}{a,b,…}".
export const subDivisions = pgTable(
  "sub_divisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    divisionId: uuid("division_id").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.divisionId, table.position)],
);

// Where a registered player sits in the seeding: first a division (sub-division
// null), then a sub-division. One row per player per season.
export const placements = pgTable(
  "placements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    windowId: uuid("window_id").notNull(),
    userId: uuid("user_id").notNull(),
    divisionId: uuid("division_id"),
    subDivisionId: uuid("sub_division_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.windowId, table.userId)],
);
