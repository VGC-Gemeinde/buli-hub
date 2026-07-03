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