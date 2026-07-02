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
