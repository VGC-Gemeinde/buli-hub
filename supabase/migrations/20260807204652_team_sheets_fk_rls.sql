-- FKs + RLS for team sheets. Server-only (RLS on, no policies), like the other
-- tables the app reads through Drizzle: authorization lives in the server
-- actions, and this is the defense-in-depth net.
--
-- Both references cascade. A sheet is one player's team *for one reported
-- match*: delete the result and the sheet documents nothing, delete the account
-- and it belongs to nobody. Cascading on match_results (not matches) is what
-- makes a dispute that reopens a match drop the sheets with it, so the paste
-- URLs stop resolving at the same moment the result stops existing.

ALTER TABLE "team_sheets"
  ADD CONSTRAINT "team_sheets_match_id_match_results_fk"
  FOREIGN KEY ("match_id") REFERENCES "match_results" ("match_id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "team_sheets"
  ADD CONSTRAINT "team_sheets_player_id_auth_users_fk"
  FOREIGN KEY ("player_id") REFERENCES auth.users (id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "team_sheets" ENABLE ROW LEVEL SECURITY;
