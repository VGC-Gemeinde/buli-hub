-- FK for the staff member who recorded a drop after the regular season.
ALTER TABLE "placements"
  ADD CONSTRAINT "placements_late_dropped_by_id_fk"
  FOREIGN KEY ("late_dropped_by_id") REFERENCES auth.users (id)
  ON DELETE SET NULL;
