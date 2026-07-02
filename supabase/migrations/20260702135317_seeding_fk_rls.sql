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
