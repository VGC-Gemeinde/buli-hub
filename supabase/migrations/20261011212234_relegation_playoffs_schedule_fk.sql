-- FK for the window a match belongs to (docs/plans/relegation-and-playoffs.md).
-- Relegation and playoff matches have no sub-division, so the window is their
-- only anchor; deleting a window tears its matches down like its matchdays.

ALTER TABLE "matches"
  ADD CONSTRAINT "matches_window_id_fk"
  FOREIGN KEY ("window_id") REFERENCES "registration_windows" (id)
  ON DELETE CASCADE;
