import { describe, expect, it } from "vitest";
import { isLocalDatabaseUrl, localDatabaseError } from "./local-database";

const LOCAL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const PROD =
  "postgresql://postgres.abcdef:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";

describe("isLocalDatabaseUrl", () => {
  it("accepts the local stack in its usual forms", () => {
    expect(isLocalDatabaseUrl(LOCAL)).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://localhost:54322/postgres")).toBe(
      true,
    );
    expect(isLocalDatabaseUrl("postgresql://user:pw@[::1]:5432/postgres")).toBe(
      true,
    );
  });

  it("rejects hosted databases", () => {
    expect(isLocalDatabaseUrl(PROD)).toBe(false);
    expect(
      isLocalDatabaseUrl(
        "postgresql://u:p@db.abcdef.supabase.co:5432/postgres",
      ),
    ).toBe(false);
  });

  // "127.0.0.1.example.com" must not pass by prefix or substring matching.
  it("is not fooled by a hostname that merely contains a local one", () => {
    expect(
      isLocalDatabaseUrl("postgresql://u:p@127.0.0.1.evil.com:5432/postgres"),
    ).toBe(false);
    expect(
      isLocalDatabaseUrl("postgresql://u:p@localhost.evil.com:5432/postgres"),
    ).toBe(false);
    expect(
      isLocalDatabaseUrl("postgresql://u:p@notlocalhost:5432/postgres"),
    ).toBe(false);
  });

  it("treats an unparseable value as not local", () => {
    expect(isLocalDatabaseUrl("not a url")).toBe(false);
    expect(isLocalDatabaseUrl("")).toBe(false);
  });
});

describe("localDatabaseError", () => {
  it("permits the local stack", () => {
    expect(localDatabaseError(LOCAL)).toBeNull();
  });

  it("permits an unset DATABASE_URL", () => {
    expect(localDatabaseError(undefined)).toBeNull();
    expect(localDatabaseError("")).toBeNull();
  });

  it("blocks a hosted database and names the host", () => {
    const error = localDatabaseError(PROD);

    expect(error).toContain("Refusing to run tests");
    expect(error).toContain("aws-0-eu-central-1.pooler.supabase.com:5432");
  });

  it("never leaks credentials into the message", () => {
    const error = localDatabaseError(PROD);

    expect(error).not.toContain("pw");
    expect(error).not.toContain("postgres.abcdef");
  });

  it("points at the variable the production string actually belongs in", () => {
    expect(localDatabaseError(PROD)).toContain("PROD_DATABASE_URL");
  });

  it("can be overridden deliberately", () => {
    expect(localDatabaseError(PROD, true)).toBeNull();
  });

  it("blocks an unparseable value rather than assuming it is safe", () => {
    expect(localDatabaseError("not a url")).toContain("Refusing to run tests");
  });
});
