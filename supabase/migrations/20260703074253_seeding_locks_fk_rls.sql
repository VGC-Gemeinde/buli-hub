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
