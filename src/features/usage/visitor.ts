import { createHash } from "node:crypto";

// What a page load is, who counts as a visitor, and how a visitor becomes a
// token. Shared by the live counter and the log backfill, so replayed history
// and live counting agree on every rule (docs/plans/usage-stats.md).

/**
 * The app's real pages, deep-linkable routes only. A closed list rather than
 * a rule, because anything looser counts probes as people: vulnerability
 * scanners hit `/etc/passwd`, `/wp-login.php` and friends with browser
 * agents, and a "no extension, not /api" rule would admit every one of them.
 *
 * Deliberately absent: `/dev/*` (a workbench), `/auth/*` (a redirect hop),
 * the legal pages, and `/staff/nutzung` itself, which should not count its
 * own readers.
 */
const PAGE_ROUTES: readonly RegExp[] = [
  /^\/$/,
  /^\/anmeldung$/,
  /^\/match\/[^/]+$/,
  /^\/pastes\/[^/]+$/,
  /^\/profil$/,
  /^\/regelwerk$/,
  /^\/spieler$/,
  /^\/spieler\/[^/]+$/,
  /^\/staff$/,
  /^\/staff\/motw$/,
  /^\/staff\/seeding$/,
];

/** Whether a request path counts as a page load. */
export function isPageLoadPath(path: string): boolean {
  return PAGE_ROUTES.some((route) => route.test(path));
}

/**
 * Obvious non-humans, matched and thrown away. Covers the Cloud Monitoring
 * uptime check ("GoogleStackdriverMonitoring-UptimeChecks" matches
 * `monitor`). An empty agent is a bot: no browser sends none.
 */
const BOT_PATTERN =
  /bot|crawler|spider|crawling|slurp|monitor|uptime|curl|wget|headless|preview/i;

export function isBot(userAgent: string): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

/**
 * The client address from `X-Forwarded-For`. Cloud Run fronts the app with
 * one proxy which *appends* the real client address, so the last entry is the
 * trustworthy one rather than anything a client prepended itself.
 */
export function clientIp(forwardedFor: string | null): string {
  return (forwardedFor ?? "").split(",").pop()?.trim() ?? "";
}

const TOKEN_LENGTH = 32;

function token(kind: "user" | "client", input: string): string {
  return createHash("sha256")
    .update(`${kind}\n${input}`)
    .digest("hex")
    .slice(0, TOKEN_LENGTH);
}

/**
 * A signed-in visitor, reduced to an opaque token before any salt is applied.
 * The same person on phone and desktop is one token; two players sharing a
 * flat are two.
 */
export function visitorTokenForUser(userId: string): string {
  return token("user", userId);
}

/**
 * An anonymous visitor: address plus user agent, so a household behind one
 * address does not collapse into a single person (the usual failure mode of
 * counting addresses alone). Also what the log backfill has to work with.
 */
export function visitorTokenForClient(ip: string, userAgent: string): string {
  return token("client", `${ip}\n${userAgent}`);
}

/** Tokens are hex of a fixed length by construction; anything else is not ours. */
export function isVisitorToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{32}$/.test(value);
}

/**
 * A visitor's per-period hash: the period's salt applied to the token. Salting
 * the token rather than the raw identity is what lets the live path and the
 * backfill agree on the same person without either carrying an address.
 */
export function fingerprint(salt: Uint8Array, visitorToken: string): Buffer {
  return createHash("sha256").update(salt).update(visitorToken).digest();
}
