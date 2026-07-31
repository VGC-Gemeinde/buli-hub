-- FKs + RLS for Regelwerk acceptances. Server-only (RLS on, no policies), like
-- the other tables the app reads through Drizzle: authorization lives in the
-- server actions, and this is the defense-in-depth net.
--
-- Both references cascade, and deliberately so. An acceptance is a statement by
-- one person about one season: delete the account and the statement has no
-- subject; delete the season and it has no object. Neither orphan is worth
-- keeping, and unlike a feedback report there is nothing left to act on.

ALTER TABLE "regelwerk_acceptances"
  ADD CONSTRAINT "regelwerk_acceptances_user_id_auth_users_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users (id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "regelwerk_acceptances"
  ADD CONSTRAINT "regelwerk_acceptances_window_id_fk"
  FOREIGN KEY ("window_id") REFERENCES "registration_windows" (id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "regelwerk_acceptances" ENABLE ROW LEVEL SECURITY;
