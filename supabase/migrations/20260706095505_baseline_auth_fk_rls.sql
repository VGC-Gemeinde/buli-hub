-- Everything Drizzle cannot express, consolidated at the go-live squash
-- (docs/decisions/migrations-squash-at-launch.md): FKs (incl. into the
-- Supabase-managed auth schema), RLS, the profiles policies + column
-- grants, and the disputes partial unique index. Section comments carry
-- the reasoning from the original per-feature migrations.

-- --- from 20260702072753_profiles_auth_fk_rls
-- Custom migration: what Drizzle can't express against the Supabase-managed
-- auth schema. RLS is defense-in-depth only — app queries connect directly
-- to Postgres and bypass it; authorization lives in server actions.

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_user_id_auth_users_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON "profiles"
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "profiles_insert_own" ON "profiles"
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "profiles_update_own" ON "profiles"
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- --- from 20260702091249_roles_column_grants
-- Defense-in-depth for the server-managed role columns: the PostgREST path
-- (role `authenticated`) may only write the user-editable settings columns.
-- Column-level grants require revoking the table-level privilege first —
-- a column REVOKE alone does not narrow a table-wide GRANT.

REVOKE INSERT, UPDATE ON "profiles" FROM authenticated;
REVOKE INSERT, UPDATE ON "profiles" FROM anon;

GRANT INSERT ("user_id", "twitter_handle", "bluesky_handle", "origin")
  ON "profiles" TO authenticated;
GRANT UPDATE ("twitter_handle", "bluesky_handle", "origin")
  ON "profiles" TO authenticated;

-- --- from 20260702094046_registration_windows_fk_rls
-- opened_by references the Supabase-managed auth schema (not expressible in
-- Drizzle). No ON DELETE clause: opened_by is a NOT NULL audit field, so a
-- staff account that opened a window cannot be deleted while the row exists.
-- RLS is enabled with no policies: the PostgREST path (anon / authenticated)
-- can neither read nor write staff data; only server code, which connects
-- directly to Postgres and bypasses RLS, touches this table.

ALTER TABLE "registration_windows"
  ADD CONSTRAINT "registration_windows_opened_by_auth_users_fk"
  FOREIGN KEY ("opened_by") REFERENCES auth.users (id);

ALTER TABLE "registration_windows" ENABLE ROW LEVEL SECURITY;

-- --- from 20260702114945_registrations_fk_rls
-- FKs into the Supabase-managed auth schema / cascade behavior Drizzle does
-- not express, plus RLS. registrations is server-only (like
-- registration_windows): RLS on, no policies.

ALTER TABLE "registrations"
  ADD CONSTRAINT "registrations_window_id_fk"
  FOREIGN KEY ("window_id") REFERENCES "registration_windows" (id)
  ON DELETE CASCADE;

ALTER TABLE "registrations"
  ADD CONSTRAINT "registrations_user_id_auth_users_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "registrations" ENABLE ROW LEVEL SECURITY;

-- has_capture_card is user-editable, like the other settings columns — extend
-- the authenticated column grants to include it (defense-in-depth parity;
-- app writes still go through server actions on the direct connection).
GRANT INSERT ("has_capture_card") ON "profiles" TO authenticated;
GRANT UPDATE ("has_capture_card") ON "profiles" TO authenticated;

-- --- from 20260702135317_seeding_fk_rls
-- FKs + cascade/set-null behavior and RLS for the seeding tables. Server-only
-- (RLS on, no policies), like the other staff tables. Deleting a season's
-- registration window tears down its whole seeding; deleting a division nulls
-- the affected placements (players become unassigned) rather than removing the
-- player rows.

ALTER TABLE "seedings"
  ADD CONSTRAINT "seedings_window_id_fk"
  FOREIGN KEY ("window_id") REFERENCES "registration_windows" (id)
  ON DELETE CASCADE;

ALTER TABLE "divisions"
  ADD CONSTRAINT "divisions_window_id_fk"
  FOREIGN KEY ("window_id") REFERENCES "registration_windows" (id)
  ON DELETE CASCADE;

ALTER TABLE "sub_divisions"
  ADD CONSTRAINT "sub_divisions_division_id_fk"
  FOREIGN KEY ("division_id") REFERENCES "divisions" (id) ON DELETE CASCADE;

ALTER TABLE "placements"
  ADD CONSTRAINT "placements_window_id_fk"
  FOREIGN KEY ("window_id") REFERENCES "registration_windows" (id)
  ON DELETE CASCADE;

ALTER TABLE "placements"
  ADD CONSTRAINT "placements_user_id_auth_users_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "placements"
  ADD CONSTRAINT "placements_division_id_fk"
  FOREIGN KEY ("division_id") REFERENCES "divisions" (id) ON DELETE SET NULL;

ALTER TABLE "placements"
  ADD CONSTRAINT "placements_sub_division_id_fk"
  FOREIGN KEY ("sub_division_id") REFERENCES "sub_divisions" (id)
  ON DELETE SET NULL;

ALTER TABLE "seedings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "divisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sub_divisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "placements" ENABLE ROW LEVEL SECURITY;

-- --- from 20260703045031_schedule_fk_rls
-- FKs + cascade behavior and RLS for the schedule tables. Server-only (RLS on,
-- no policies), like the other staff tables. Deleting a season's registration
-- window tears down its matchdays; deleting a sub-division tears down its
-- matches; deleting a player removes their matches.

ALTER TABLE "matchdays"
  ADD CONSTRAINT "matchdays_window_id_fk"
  FOREIGN KEY ("window_id") REFERENCES "registration_windows" (id)
  ON DELETE CASCADE;

ALTER TABLE "matches"
  ADD CONSTRAINT "matches_sub_division_id_fk"
  FOREIGN KEY ("sub_division_id") REFERENCES "sub_divisions" (id)
  ON DELETE CASCADE;

ALTER TABLE "matches"
  ADD CONSTRAINT "matches_player_a_id_auth_users_fk"
  FOREIGN KEY ("player_a_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "matches"
  ADD CONSTRAINT "matches_player_b_id_auth_users_fk"
  FOREIGN KEY ("player_b_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "matchdays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "matches" ENABLE ROW LEVEL SECURITY;

-- --- from 20260703074253_seeding_locks_fk_rls
-- FKs + RLS for the seeding control lock. Server-only (RLS on, no policies),
-- like the other seeding tables. Deleting a season's registration window tears
-- down its lock; deleting the holding user releases the lock.

ALTER TABLE "seeding_locks"
  ADD CONSTRAINT "seeding_locks_window_id_fk"
  FOREIGN KEY ("window_id") REFERENCES "registration_windows" (id)
  ON DELETE CASCADE;

ALTER TABLE "seeding_locks"
  ADD CONSTRAINT "seeding_locks_holder_id_auth_users_fk"
  FOREIGN KEY ("holder_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "seeding_locks" ENABLE ROW LEVEL SECURITY;

-- --- from 20260703102605_match_reporting_fk_rls
-- FKs + RLS for match reporting. Server-only (RLS on, no policies), like the
-- other match/season tables. A result dies with its match; its games die with
-- the result. Player/reporter/winner references cascade (deleting a user tears
-- down their results); the informational references (discussed-with, confirmed-
-- by, corrected-by) set null so losing that staff member never deletes a result.

ALTER TABLE "match_results"
  ADD CONSTRAINT "match_results_match_id_fk"
  FOREIGN KEY ("match_id") REFERENCES "matches" (id) ON DELETE CASCADE;

ALTER TABLE "match_results"
  ADD CONSTRAINT "match_results_winner_id_auth_users_fk"
  FOREIGN KEY ("winner_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "match_results"
  ADD CONSTRAINT "match_results_reported_by_id_auth_users_fk"
  FOREIGN KEY ("reported_by_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "match_results"
  ADD CONSTRAINT "match_results_discussed_with_id_auth_users_fk"
  FOREIGN KEY ("discussed_with_id") REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE "match_results"
  ADD CONSTRAINT "match_results_confirmed_by_id_auth_users_fk"
  FOREIGN KEY ("confirmed_by_id") REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE "match_results"
  ADD CONSTRAINT "match_results_corrected_by_id_auth_users_fk"
  FOREIGN KEY ("corrected_by_id") REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE "match_games"
  ADD CONSTRAINT "match_games_match_id_fk"
  FOREIGN KEY ("match_id") REFERENCES "match_results" (match_id) ON DELETE CASCADE;

ALTER TABLE "match_games"
  ADD CONSTRAINT "match_games_winner_id_auth_users_fk"
  FOREIGN KEY ("winner_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "match_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "match_games" ENABLE ROW LEVEL SECURITY;
-- --- from 20260703195011_disputes_fk_rls
-- FKs + RLS for disputes. Server-only (RLS on, no policies). A dispute dies
-- with its match; the opener cascades; the resolver is informational (set null).
-- At most one open dispute per match.

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_match_id_fk"
  FOREIGN KEY ("match_id") REFERENCES "matches" (id) ON DELETE CASCADE;

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_opened_by_id_auth_users_fk"
  FOREIGN KEY ("opened_by_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_resolved_by_id_auth_users_fk"
  FOREIGN KEY ("resolved_by_id") REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX "disputes_one_open_per_match"
  ON "disputes" ("match_id") WHERE "status" = 'open';

ALTER TABLE "disputes" ENABLE ROW LEVEL SECURITY;

-- --- from 20260705174703_motw_fk_rls
-- FKs + RLS for the Match of the Week. Server-only (RLS on, no policies), like
-- the other match/season tables. A selection dies with its window or match;
-- the selecting staff member cascades (actor provenance, like reported_by).

ALTER TABLE "motw_selections"
  ADD CONSTRAINT "motw_selections_window_id_fk"
  FOREIGN KEY ("window_id") REFERENCES "registration_windows" (id) ON DELETE CASCADE;

ALTER TABLE "motw_selections"
  ADD CONSTRAINT "motw_selections_match_id_fk"
  FOREIGN KEY ("match_id") REFERENCES "matches" (id) ON DELETE CASCADE;

ALTER TABLE "motw_selections"
  ADD CONSTRAINT "motw_selections_selected_by_id_auth_users_fk"
  FOREIGN KEY ("selected_by_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "motw_selections" ENABLE ROW LEVEL SECURITY;

-- --- from 20260705200109_discord_posts_fk_rls
-- FK + RLS for discord_posts. Server-only (RLS on, no policies), like the
-- other match/season tables. A post row dies with its match; the Discord
-- message itself is best-effort cleanup at the action layer.

ALTER TABLE "discord_posts"
  ADD CONSTRAINT "discord_posts_match_id_fk"
  FOREIGN KEY ("match_id") REFERENCES "matches" (id) ON DELETE CASCADE;

ALTER TABLE "discord_posts" ENABLE ROW LEVEL SECURITY;

-- --- from 20260705225032_player_drops_fk
-- FK for the drop provenance. Informational: losing the staff member's
-- account must never delete or alter a placement, so set null (like the
-- other corrected/confirmed-by references). RLS on placements exists.

ALTER TABLE "placements"
  ADD CONSTRAINT "placements_dropped_by_id_auth_users_fk"
  FOREIGN KEY ("dropped_by_id") REFERENCES auth.users (id) ON DELETE SET NULL;

