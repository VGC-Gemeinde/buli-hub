// Drizzle schema — the source of truth for the data model.
//
// Workflow: edit this file → `npm run db:generate` → review the generated SQL
// in supabase/migrations/ → `npm run db:migrate`.
//
// Tables are added per feature (see CLAUDE.md); the schema stays central
// because tables cross feature boundaries.

import {
  boolean,
  date,
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
    prevDivision: integer("prev_division"),
    prevPlacement: integer("prev_placement"),
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
// seeding per window; holds the season-wide sub-division size and the finalize
// state. Divisions/sub-divisions/placements hang off it. All FKs + RLS live in
// a custom migration (server-only, like the other staff tables).
export const seedings = pgTable("seedings", {
  windowId: uuid("window_id").primaryKey(),
  subDivisionSize: integer("sub_division_size").notNull(),
  // Set when staff save a valid post-season config (promotion/demotion rules).
  // Required for finalize; cleared when the seeding config changes so a stale
  // confirmation cannot slip through. See docs/plans/post-season-setup.md.
  postSeasonConfiguredAt: timestamp("post_season_configured_at", {
    withTimezone: true,
  }),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Which standings table decides a division's post-season movement: one table per
// sub-division (counts are per group), or the global division table (counts are
// per division; only selectable when every group is the same size).
export const relevantTableEnum = pgEnum("relevant_table", [
  "sub_division",
  "division",
]);

// A division = a skill tier within a season (1 = top). Name is derived:
// „Division {tier}". The post-season columns are the promotion/demotion rules
// (see docs/plans/post-season-setup.md): guaranteed movement + playoff slots,
// interpreted per group in sub_division mode, per division in division mode.
export const divisions = pgTable(
  "divisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    windowId: uuid("window_id").notNull(),
    tier: integer("tier").notNull(),
    relevantTable: relevantTableEnum("relevant_table")
      .notNull()
      .default("sub_division"),
    guaranteedPromotions: integer("guaranteed_promotions").notNull().default(0),
    guaranteedDemotions: integer("guaranteed_demotions").notNull().default(0),
    promotionPlayoffSlots: integer("promotion_playoff_slots")
      .notNull()
      .default(0),
    demotionPlayoffSlots: integer("demotion_playoff_slots")
      .notNull()
      .default(0),
    // Title-playoff slots — only the top tier: the top N qualify for the
    // tournament that decides the Bundesliga champion. See
    // docs/plans/championship-playoff.md.
    championshipPlayoffSlots: integer("championship_playoff_slots")
      .notNull()
      .default(0),
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

// Who is currently driving a season's seeding. Division seeding is a live staff
// meeting (one person shares their screen, the group discusses); this soft lock
// keeps everyone else in read-only until they explicitly take control. A stale
// `heartbeat_at` (older than the client TTL) means the holder's tab is gone and
// the lock is free to take. Separate from `seedings` because control can be
// taken before any config row exists. Server-only (RLS on, no policies).
export const seedingLocks = pgTable("seeding_locks", {
  windowId: uuid("window_id").primaryKey(),
  holderId: uuid("holder_id").notNull(),
  acquiredAt: timestamp("acquired_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The season-wide Spieltag calendar generated from a finalized seeding: one row
// per matchday (round), shared across all sub-divisions. Week 1 starts on
// generation; each week's `ends_on` is its deadline (staff-editable in the
// dialog), and starts follow from the previous deadline. The presence of these
// rows marks the season as running (no status column). FKs + RLS in a custom
// migration (server-only, like the other staff tables).
export const matchdays = pgTable(
  "matchdays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    windowId: uuid("window_id").notNull(),
    round: integer("round").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.windowId, table.round)],
);

// One match in a sub-division's single round-robin: two players on one matchday
// (`round`), or a bye when `player_b_id` is null. Its date is the matchday for
// the same window + round. Result columns arrive with the reporting feature.
// FKs + RLS in a custom migration.
export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  subDivisionId: uuid("sub_division_id").notNull(),
  round: integer("round").notNull(),
  playerAId: uuid("player_a_id").notNull(),
  playerBId: uuid("player_b_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The kind of result recorded for a match. Drives which columns are meaningful
// and how standings count it. „normal" = a best-of-3 was played (winner from the
// games); „free_win" = a walkover (winner set, no games, pending staff
// confirmation); „double_loss" = both players lose, no winner. Only normal and
// free_win are player-reportable; double_loss (and corrections/confirmation) are
// staff-issued — modeled now, their UI arrives with the staff dashboard.
export const matchOutcomeEnum = pgEnum("match_outcome", [
  "normal",
  "free_win",
  "double_loss",
]);

// A reported result for a match (1:1, `match_id` PK — a result is a distinct
// lifecycle object from the pairing, may not exist yet, and can later be
// corrected in place). Per-game rows live in `match_games`. FKs + RLS in a
// custom migration (server-only, no policies, like the other tables).
export const matchResults = pgTable("match_results", {
  matchId: uuid("match_id").primaryKey(),
  outcome: matchOutcomeEnum("outcome").notNull(),
  // Absolute winner. Set for normal + free_win; null for double_loss.
  winnerId: uuid("winner_id"),
  // Platform the match was played on. Set for normal; null otherwise.
  platform: platformEnum("platform"),
  // Both required for a normal report (pokepaste URLs); null otherwise.
  playerATeamUrl: text("player_a_team_url"),
  playerBTeamUrl: text("player_b_team_url"),
  // Cartridge only: one optional match video (per-game replays live on
  // match_games for Showdown).
  videoUrl: text("video_url"),
  // Free-win only: the reason and the staff/admin member discussed with.
  freeWinReason: text("free_win_reason"),
  discussedWithId: uuid("discussed_with_id"),
  // Provenance: who submitted the result.
  reportedById: uuid("reported_by_id").notNull(),
  reportedAt: timestamp("reported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Free-win confirmation lifecycle. Stays null (pending) until a staff member
  // confirms — that UI ships with the staff dashboard.
  confirmedById: uuid("confirmed_by_id"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  // Correction provenance (staff feature; null now). Set when this row replaced
  // a prior result.
  correctedById: uuid("corrected_by_id"),
  correctedAt: timestamp("corrected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One game of a normal (best-of-3) result: 1–3 rows per match_results. Showdown
// carries a required replay link per game; Cartridge carries none (its optional
// video lives on match_results). FKs + RLS in a custom migration.
export const matchGames = pgTable(
  "match_games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id").notNull(),
    // 1-based game number within the best-of-3 (1, 2, optionally 3).
    gameNumber: integer("game_number").notNull(),
    winnerId: uuid("winner_id").notNull(),
    replayUrl: text("replay_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.matchId, table.gameNumber)],
);

export const disputeStatusEnum = pgEnum("dispute_status", ["open", "resolved"]);
export const disputeResolutionEnum = pgEnum("dispute_resolution", [
  "upheld", // the reported result stands
  "corrected", // staff edited the result
]);

// A participant contesting a match's recorded result; staff adjudicate. A log
// per match (multiple over time) with at most one `open` at a time — the
// partial unique index enforcing that lives in the custom migration, alongside
// FKs + RLS (server-only, no policies).
export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id").notNull(),
  openedById: uuid("opened_by_id").notNull(),
  reason: text("reason").notNull(),
  status: disputeStatusEnum("status").notNull().default("open"),
  resolution: disputeResolutionEnum("resolution"),
  resolvedById: uuid("resolved_by_id"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  note: text("note"),
  openedAt: timestamp("opened_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
