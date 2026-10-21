import { describe, expect, it } from "vitest";
import {
  expiryCutoff,
  hashSessionToken,
  needsRenewal,
  newSessionToken,
  sessionState,
} from "./session";

const now = new Date("2026-10-21T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

describe("newSessionToken", () => {
  it("is 43 base64url characters and differs every time", () => {
    const a = newSessionToken();
    const b = newSessionToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });
});

describe("hashSessionToken", () => {
  it("is the stable SHA-256 hex digest", () => {
    expect(hashSessionToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(hashSessionToken("abc")).toBe(hashSessionToken("abc"));
  });
});

describe("sessionState", () => {
  it("is valid up to just before 30 days without use", () => {
    expect(sessionState(now, now)).toBe("valid");
    expect(sessionState(daysAgo(29.99), now)).toBe("valid");
  });

  it("expires at exactly 30 days", () => {
    expect(sessionState(daysAgo(30), now)).toBe("expired");
    expect(sessionState(daysAgo(400), now)).toBe("expired");
  });

  it("agrees with the cutoff used to purge expired rows", () => {
    expect(sessionState(expiryCutoff(now), now)).toBe("expired");
  });
});

describe("needsRenewal", () => {
  it("renews only when the last use is more than a day old", () => {
    expect(needsRenewal(now, now)).toBe(false);
    expect(needsRenewal(daysAgo(1), now)).toBe(false);
    expect(needsRenewal(daysAgo(1.01), now)).toBe(true);
  });
});
