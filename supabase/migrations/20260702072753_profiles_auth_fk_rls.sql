-- Custom migration: what Drizzle can't express against the Supabase-managed
-- auth schema. RLS is defense-in-depth only — app queries connect directly
-- to Postgres and bypass it; authorization lives in server actions.

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_user_id_auth_users_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON "profiles"
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "profiles_insert_own" ON "profiles"
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "profiles_update_own" ON "profiles"
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
