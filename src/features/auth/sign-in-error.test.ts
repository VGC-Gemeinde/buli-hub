import { describe, expect, it } from "vitest";
import {
  classifySignInError,
  parseSignInErrorKind,
  SIGN_IN_ERROR_COPY,
  SIGN_IN_ERROR_KINDS,
} from "./sign-in-error";

describe("classifySignInError", () => {
  it("recognises a cancelled consent screen", () => {
    expect(classifySignInError({ error: "access_denied" })).toBe("cancelled");
  });

  it("falls back to unknown for every other Discord error", () => {
    expect(classifySignInError({ error: "server_error" })).toBe("unknown");
    expect(classifySignInError({ error: "invalid_scope" })).toBe("unknown");
  });

  it("treats a callback without an error as unknown", () => {
    expect(classifySignInError({ error: null })).toBe("unknown");
  });

  it("no longer knows the email category of the Supabase sign-in", () => {
    expect(SIGN_IN_ERROR_KINDS).toEqual(["cancelled", "unknown"]);
  });
});

describe("parseSignInErrorKind", () => {
  it("returns null when no error is present", () => {
    expect(parseSignInErrorKind(undefined)).toBeNull();
    expect(parseSignInErrorKind("")).toBeNull();
  });

  it("accepts every known kind", () => {
    for (const kind of SIGN_IN_ERROR_KINDS) {
      expect(parseSignInErrorKind(kind)).toBe(kind);
    }
  });

  it("maps tampered or legacy values to unknown", () => {
    expect(parseSignInErrorKind("no_email")).toBe("unknown");
    expect(parseSignInErrorKind("1")).toBe("unknown");
    expect(parseSignInErrorKind("<script>")).toBe("unknown");
  });
});

describe("SIGN_IN_ERROR_COPY", () => {
  it("has plain German copy for every kind", () => {
    for (const kind of SIGN_IN_ERROR_KINDS) {
      expect(SIGN_IN_ERROR_COPY[kind]).not.toContain("—");
      expect(SIGN_IN_ERROR_COPY[kind].length).toBeGreaterThan(10);
    }
  });
});
