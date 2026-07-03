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
