import { createHash, randomBytes } from "node:crypto";

// The pure rules of a hub session (specs/004-google-cloud-migration,
// contracts/session.md, data-model.md). The browser holds a random token; the
// database holds only its SHA-256, so a leaked table signs nobody in.

export const SESSION_MAX_AGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 32 random bytes, base64url: 43 characters. */
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A session ends after 30 days without use. */
export function sessionState(lastSeenAt: Date, now: Date): "valid" | "expired" {
  return now.getTime() - lastSeenAt.getTime() >= SESSION_MAX_AGE_DAYS * DAY_MS
    ? "expired"
    : "valid";
}

/** Use renews a session at most once a day, so a request rarely writes. */
export function needsRenewal(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() > DAY_MS;
}

/** The moment before which a session counts as expired. */
export function expiryCutoff(now: Date): Date {
  return new Date(now.getTime() - SESSION_MAX_AGE_DAYS * DAY_MS);
}
