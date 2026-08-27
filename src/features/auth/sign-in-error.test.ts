import { describe, expect, it } from "vitest";
import {
  classifySignInError,
  parseSignInErrorKind,
  SIGN_IN_ERROR_COPY,
  SIGN_IN_ERROR_KINDS,
} from "./sign-in-error";

describe("classifySignInError", () => {
  it("recognises Discord accounts without a verified email", () => {
    expect(
      classifySignInError({
        error: "server_error",
        description: "Error getting user email from external provider",
        exchangeError: null,
      }),
    ).toBe("no_email");
  });

  it("recognises the same failure surfaced by the code exchange", () => {
    expect(
      classifySignInError({
        error: null,
        description: null,
        exchangeError: "Error getting user email from external provider",
      }),
    ).toBe("no_email");
  });

  it("recognises a cancelled consent screen", () => {
    expect(
      classifySignInError({
        error: "access_denied",
        description: "The resource owner denied the request",
        exchangeError: null,
      }),
    ).toBe("cancelled");
  });

  it("falls back to unknown without leaking the message", () => {
    const kind = classifySignInError({
      error: "server_error",
      description: "Unexpected failure in postgres: relation missing",
      exchangeError: null,
    });
    expect(kind).toBe("unknown");
    expect(SIGN_IN_ERROR_COPY[kind]).not.toContain("postgres");
  });

  it("treats a missing code with no params as unknown", () => {
    expect(
      classifySignInError({
        error: null,
        description: null,
        exchangeError: null,
      }),
    ).toBe("unknown");
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
