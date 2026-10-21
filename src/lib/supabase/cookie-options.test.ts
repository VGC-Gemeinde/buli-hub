import { describe, expect, it } from "vitest";
import { legacySessionKey, sessionCookieOptions } from "./cookie-options";

describe("sessionCookieOptions", () => {
  it("shares the session across the Gemeinde domain when AUTH_COOKIE_DOMAIN is set", () => {
    expect(
      sessionCookieOptions({ AUTH_COOKIE_DOMAIN: ".vgcgemein.de" }),
    ).toEqual({
      name: "gemeinde-auth",
      domain: ".vgcgemein.de",
      path: "/",
      sameSite: "lax",
      secure: true,
      httpOnly: true,
    });
  });

  it("keeps the library's per-host cookie, hidden from scripts, without it", () => {
    expect(sessionCookieOptions({})).toEqual({ httpOnly: true });
    expect(sessionCookieOptions({ AUTH_COOKIE_DOMAIN: "" })).toEqual({
      httpOnly: true,
    });
  });
});

describe("legacySessionKey", () => {
  it("is the library's default storage key: the first host label of the project URL", () => {
    expect(legacySessionKey("https://comibjasharlauepcnye.supabase.co")).toBe(
      "sb-comibjasharlauepcnye-auth-token",
    );
    expect(legacySessionKey("http://127.0.0.1:54321")).toBe(
      "sb-127-auth-token",
    );
  });
});
