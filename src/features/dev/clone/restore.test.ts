import { describe, expect, it } from "vitest";
import { stripForeignDefaultPrivileges } from "./restore";

describe("stripForeignDefaultPrivileges", () => {
  it("drops statements for roles other than postgres", () => {
    const sql = [
      "ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;",
      "ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;",
    ].join("\n");

    expect(stripForeignDefaultPrivileges(sql).trim()).toBe("");
  });

  it("keeps the postgres statements, which do apply", () => {
    const line =
      "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;";

    expect(stripForeignDefaultPrivileges(line)).toBe(line);
  });

  // The distinction that matters: GRANT is the schema's actual permissions and
  // must survive; ALTER DEFAULT PRIVILEGES only concerns future objects.
  it("passes grants, policies, RLS and data through untouched", () => {
    const sql = [
      "GRANT ALL ON TABLE public.profiles TO anon;",
      "GRANT INSERT(user_id) ON TABLE public.profiles TO authenticated;",
      "ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;",
      "CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (true);",
      "COPY public.profiles (user_id) FROM stdin;",
      "\\.",
    ].join("\n");

    expect(stripForeignDefaultPrivileges(sql)).toBe(sql);
  });

  it("removes only the offending statements from a mixed dump", () => {
    const sql = [
      "CREATE TABLE public.profiles (user_id uuid);",
      "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;",
      "ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;",
      "GRANT ALL ON TABLE public.profiles TO service_role;",
    ].join("\n");

    const result = stripForeignDefaultPrivileges(sql).split("\n");

    expect(result).toEqual([
      "CREATE TABLE public.profiles (user_id uuid);",
      "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;",
      "GRANT ALL ON TABLE public.profiles TO service_role;",
    ]);
  });

  it("skips a wrapped statement to its terminator, not just one line", () => {
    const sql = [
      "ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public",
      "  GRANT ALL ON TABLES TO anon;",
      "GRANT ALL ON TABLE public.profiles TO anon;",
    ].join("\n");

    expect(stripForeignDefaultPrivileges(sql)).toBe(
      "GRANT ALL ON TABLE public.profiles TO anon;",
    );
  });

  it("leaves a dump without default privileges unchanged", () => {
    const sql =
      "CREATE TABLE public.x (id int);\nGRANT ALL ON TABLE public.x TO anon;";

    expect(stripForeignDefaultPrivileges(sql)).toBe(sql);
  });

  it("honours a different keepRole", () => {
    const sql = [
      "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;",
      "ALTER DEFAULT PRIVILEGES FOR ROLE owner IN SCHEMA public GRANT ALL ON TABLES TO anon;",
    ].join("\n");

    expect(stripForeignDefaultPrivileges(sql, "owner")).toBe(
      "ALTER DEFAULT PRIVILEGES FOR ROLE owner IN SCHEMA public GRANT ALL ON TABLES TO anon;",
    );
  });
});
