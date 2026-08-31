import { describe, expect, it } from "vitest";
import {
  clientIp,
  fingerprint,
  isBot,
  isPageLoadPath,
  isVisitorToken,
  visitorTokenForClient,
  visitorTokenForUser,
} from "./visitor";

describe("page load paths", () => {
  it("counts every real route", () => {
    for (const path of [
      "/",
      "/anmeldung",
      "/match/6f1c2a4e-1111-2222-3333-444444444444",
      "/pastes/6f1c2a4e-1111-2222-3333-444444444444",
      "/profil",
      "/regelwerk",
      "/spieler",
      "/spieler/6f1c2a4e-1111-2222-3333-444444444444",
      "/staff",
      "/staff/motw",
      "/staff/seeding",
    ]) {
      expect(isPageLoadPath(path), path).toBe(true);
    }
  });

  it("keeps probes, assets, the API, /dev and the page itself out", () => {
    for (const path of [
      "/etc/passwd",
      "/wp-login.php",
      "/.env",
      "/favicon.ico",
      "/logo.svg",
      "/_next/static/chunk.js",
      "/api/anything",
      "/auth/callback",
      "/dev",
      "/dev/ui",
      "/impressum",
      "/datenschutz",
      "/staff/nutzung",
      "/match",
      "/match/a/b",
    ]) {
      expect(isPageLoadPath(path), path).toBe(false);
    }
  });
});

describe("bot filtering", () => {
  it("recognises crawlers and monitors, and lets browsers through", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(
      isBot(
        "GoogleStackdriverMonitoring-UptimeChecks(https://cloud.google.com/monitoring)",
      ),
    ).toBe(true);
    expect(isBot("curl/8.5.0")).toBe(true);
    expect(isBot("Discordbot/2.0")).toBe(true);
    expect(isBot("")).toBe(true);
    expect(
      isBot(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
  });
});

describe("client address", () => {
  it("takes the last X-Forwarded-For entry, the one the proxy appended", () => {
    expect(clientIp("1.1.1.1, 203.0.113.9")).toBe("203.0.113.9");
    expect(clientIp("203.0.113.9")).toBe("203.0.113.9");
    expect(clientIp(null)).toBe("");
  });
});

describe("visitor tokens", () => {
  it("are stable, opaque and of the expected shape", () => {
    const a = visitorTokenForUser("user-1");
    expect(a).toBe(visitorTokenForUser("user-1"));
    expect(isVisitorToken(a)).toBe(true);
    expect(a).not.toContain("user-1");
    expect(isVisitorToken(visitorTokenForClient("203.0.113.9", "Safari"))).toBe(
      true,
    );
  });

  it("tell people apart, including behind one address", () => {
    expect(visitorTokenForClient("203.0.113.9", "Safari")).not.toBe(
      visitorTokenForClient("203.0.113.9", "Firefox"),
    );
    expect(visitorTokenForClient("203.0.113.9", "Safari")).not.toBe(
      visitorTokenForClient("203.0.113.10", "Safari"),
    );
    expect(visitorTokenForUser("abc")).not.toBe(
      visitorTokenForClient("abc", ""),
    );
  });

  it("reject anything that is not a token", () => {
    expect(isVisitorToken("203.0.113.9")).toBe(false);
    expect(isVisitorToken("x".repeat(32))).toBe(false);
    expect(isVisitorToken(42)).toBe(false);
  });

  it("hash differently under different salts", () => {
    const token = visitorTokenForUser("user-1");
    const a = fingerprint(Buffer.from("salt-a"), token);
    const b = fingerprint(Buffer.from("salt-b"), token);
    expect(a.equals(b)).toBe(false);
    expect(a.equals(fingerprint(Buffer.from("salt-a"), token))).toBe(true);
    expect(a.length).toBe(32);
  });
});
