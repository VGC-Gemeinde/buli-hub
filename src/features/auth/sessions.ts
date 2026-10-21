import { eq, lte } from "drizzle-orm";
import { sessions, users } from "@/db/schema";
import { db } from "@/lib/db";
import {
  expiryCutoff,
  hashSessionToken,
  needsRenewal,
  newSessionToken,
  sessionState,
} from "./session";

// Sessions in the database (contracts/session.md): created at sign-in, found
// by the hash of the cookie's token, renewed by use, ended by sign-out, the
// runbook command or 30 days without use.

/** Starts a session for the account and returns the token for the cookie. */
export async function createSession(
  userId: string,
  now = new Date(),
): Promise<string> {
  const token = newSessionToken();
  await db.insert(sessions).values({
    tokenHash: hashSessionToken(token),
    userId,
    createdAt: now,
    lastSeenAt: now,
  });
  // Expired rows are never honored; dropping them here keeps the table small
  // without a scheduled job (data-model.md).
  await purgeExpiredSessions(now);
  return token;
}

export type ResolvedSession = { userId: string; discordId: string };

/** The account behind a cookie token, or null when unknown or expired. */
export async function resolveSession(
  token: string,
  now = new Date(),
): Promise<ResolvedSession | null> {
  const tokenHash = hashSessionToken(token);
  const [row] = await db
    .select({
      userId: sessions.userId,
      discordId: users.discordId,
      lastSeenAt: sessions.lastSeenAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, tokenHash));
  if (!row || sessionState(row.lastSeenAt, now) === "expired") {
    return null;
  }
  if (needsRenewal(row.lastSeenAt, now)) {
    await db
      .update(sessions)
      .set({ lastSeenAt: now })
      .where(eq(sessions.tokenHash, tokenHash));
  }
  return { userId: row.userId, discordId: row.discordId };
}

/** Sign-out: ends this browser's session, not the account's others. */
export async function endSession(token: string): Promise<void> {
  await db
    .delete(sessions)
    .where(eq(sessions.tokenHash, hashSessionToken(token)));
}

/** Ends every session of an account (the runbook's command does the same). */
export async function endAllSessionsForUser(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function purgeExpiredSessions(now = new Date()): Promise<void> {
  await db.delete(sessions).where(lte(sessions.lastSeenAt, expiryCutoff(now)));
}
