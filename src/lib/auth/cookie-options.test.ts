import { describe, expect, it } from "vitest";
import {
  isLegacySupabaseCookie,
  SESSION_MAX_AGE_SECONDS,
  sessionCookie,
} from "./cookie-options";

describe("sessionCookie", () => {
  it("covers the Gemeinde domain under its own name when AUTH_COOKIE_DOMAIN is set", () => {
    expect(
      sessionCookie({
        AUTH_COOKIE_DOMAIN: ".vgcgemein.de",
        NODE_ENV: "production",
      }),
    ).toEqual({
      name: "gemeinde-auth",
      options: {
        domain: ".vgcgemein.de",
        path: "/",
        sameSite: "lax",
        secure: true,
        httpOnly: true,
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    });
  });

  it("stays on this host without it", () => {
    const cookie = sessionCookie({ NODE_ENV: "production" });
    expect(cookie.name).toBe("buli-hub-auth");
    expect(cookie.options.domain).toBeUndefined();
    expect(sessionCookie({ AUTH_COOKIE_DOMAIN: "" }).name).toBe(
      "buli-hub-auth",
    );
  });

  it("is hidden from scripts everywhere and HTTPS-only in production", () => {
    expect(sessionCookie({ NODE_ENV: "development" }).options).toMatchObject({
      httpOnly: true,
      secure: false,
    });
    expect(sessionCookie({ NODE_ENV: "production" }).options).toMatchObject({
      httpOnly: true,
      secure: true,
    });
  });

  it("lives 30 days", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(2_592_000);
  });
});

describe("isLegacySupabaseCookie", () => {
  it("matches Supabase's session cookie, its chunks and its verifier", () => {
    expect(isLegacySupabaseCookie("sb-comibjasharlauepcnye-auth-token")).toBe(
      true,
    );
    expect(isLegacySupabaseCookie("sb-127-auth-token.0")).toBe(true);
    expect(isLegacySupabaseCookie("sb-127-auth-token.12")).toBe(true);
    expect(isLegacySupabaseCookie("sb-127-auth-token-code-verifier")).toBe(
      true,
    );
  });

  it("leaves every other cookie alone", () => {
    expect(isLegacySupabaseCookie("buli-hub-auth")).toBe(false);
    expect(isLegacySupabaseCookie("gemeinde-auth")).toBe(false);
    expect(isLegacySupabaseCookie("sb-x-auth-token-other")).toBe(false);
    expect(isLegacySupabaseCookie("theme")).toBe(false);
  });
});
