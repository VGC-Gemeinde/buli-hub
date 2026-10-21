import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sessions } from "@/db/schema";
import { db } from "@/lib/db";
import { hashSessionToken } from "./session";
import {
  createSession,
  endAllSessionsForUser,
  endSession,
  purgeExpiredSessions,
  resolveSession,
} from "./sessions";

const alice = randomUUID();
const bob = randomUUID();
const now = new Date("2026-10-21T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

async function lastSeen(token: string): Promise<Date | undefined> {
  const row = await db.query.sessions.findFirst({
    columns: { lastSeenAt: true },
    where: eq(sessions.tokenHash, hashSessionToken(token)),
  });
  return row?.lastSeenAt;
}

beforeAll(async () => {
  await db.delete(sessions);
  await db.execute(
    sql`insert into users (id, discord_id) values
      (${alice}, '500000000000000001'), (${bob}, '500000000000000002')`,
  );
});

afterAll(async () => {
  await db.execute(sql`delete from users where id in (${alice}, ${bob})`);
});

describe("createSession / resolveSession", () => {
  it("resolves a fresh session to its account and stores only the hash", async () => {
    const token = await createSession(alice, now);
    expect(await resolveSession(token, now)).toEqual({
      userId: alice,
      discordId: "500000000000000001",
    });
    const stored = await db.select().from(sessions);
    expect(stored.some((row) => row.tokenHash === token)).toBe(false);
  });

  it("does not know a token it never issued", async () => {
    expect(await resolveSession("not-a-token", now)).toBeNull();
  });

  it("renews a session last used more than a day ago, not a younger one", async () => {
    const token = await createSession(alice, daysAgo(2));
    await resolveSession(token, now);
    expect(await lastSeen(token)).toEqual(now);

    const young = await createSession(alice, daysAgo(0.5));
    await resolveSession(young, now);
    expect(await lastSeen(young)).toEqual(daysAgo(0.5));
  });

  it("refuses a session unused for 30 days", async () => {
    const token = await createSession(alice, daysAgo(30));
    expect(await resolveSession(token, now)).toBeNull();
  });
});

describe("ending sessions", () => {
  it("signs out one browser and keeps the account's other sessions", async () => {
    const laptop = await createSession(bob, now);
    const phone = await createSession(bob, now);
    await endSession(laptop);
    expect(await resolveSession(laptop, now)).toBeNull();
    expect(await resolveSession(phone, now)).not.toBeNull();
  });

  it("ends every session of one account and no other", async () => {
    const bobs = await createSession(bob, now);
    const alices = await createSession(alice, now);
    await endAllSessionsForUser(bob);
    expect(await resolveSession(bobs, now)).toBeNull();
    expect(await resolveSession(alices, now)).not.toBeNull();
  });

  it("purges expired rows only", async () => {
    const old = await createSession(alice, daysAgo(31));
    const fresh = await createSession(alice, now);
    await purgeExpiredSessions(now);
    expect(await lastSeen(old)).toBeUndefined();
    expect(await lastSeen(fresh)).toEqual(now);
  });

  it("goes with the account", async () => {
    const carol = randomUUID();
    await db.execute(
      sql`insert into users (id, discord_id) values (${carol}, '500000000000000003')`,
    );
    const token = await createSession(carol, now);
    await db.execute(sql`delete from users where id = ${carol}`);
    expect(await lastSeen(token)).toBeUndefined();
  });
});
