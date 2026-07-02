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
