import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { feedbackReports } from "@/db/schema";
import { createWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import { insertFeedback, markPosted, recentFeedbackCount } from "./queries";

const alice = randomUUID();
const bob = randomUUID();
let windowId: string;

function report(overrides: Partial<Parameters<typeof insertFeedback>[0]> = {}) {
  return {
    kind: "bug" as const,
    title: "Spieltag lädt nicht",
    body: "Die Seite bleibt weiß.",
    path: "/",
    userAgent: "Mozilla/5.0",
    buildSha: "abc1234",
    windowId,
    round: 2,
    reporterId: alice,
    reporterRole: "player" as const,
    ...overrides,
  };
}

beforeAll(async () => {
  for (const id of [alice, bob]) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }
  await createWindow(new Date("2026-06-30T18:00:00Z"), alice, 1);
  const rows = await db.execute<{ id: string }>(
    sql`select id from registration_windows where opened_by = ${alice}`,
  );
  windowId = rows[0].id;
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  for (const id of [alice, bob]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("insertFeedback / markPosted", () => {
  it("stores a report unposted, then records its thread", async () => {
    const id = await insertFeedback(report());

    const stored = await db.query.feedbackReports.findFirst({
      where: eq(feedbackReports.id, id),
    });
    expect(stored?.threadId).toBeNull();
    expect(stored?.postedAt).toBeNull();
    expect(stored?.reporterRole).toBe("player");
    expect(stored?.round).toBe(2);

    await markPosted(id, { threadId: "999", guildId: "111" });

    const posted = await db.query.feedbackReports.findFirst({
      where: eq(feedbackReports.id, id),
    });
    expect(posted?.threadId).toBe("999");
    expect(posted?.threadGuildId).toBe("111");
    expect(posted?.postedAt).not.toBeNull();

    await db.delete(feedbackReports).where(eq(feedbackReports.id, id));
  });

  it("keeps the report when its season window is deleted", async () => {
    await createWindow(new Date("2026-07-30T18:00:00Z"), bob, 2);
    const rows = await db.execute<{ id: string }>(
      sql`select id from registration_windows where opened_by = ${bob}`,
    );
    const doomedWindow = rows[0].id;
    const id = await insertFeedback(report({ windowId: doomedWindow }));

    await db.execute(
      sql`delete from registration_windows where id = ${doomedWindow}`,
    );

    const stored = await db.query.feedbackReports.findFirst({
      where: eq(feedbackReports.id, id),
    });
    expect(stored).toBeDefined();
    expect(stored?.windowId).toBeNull();

    await db.delete(feedbackReports).where(eq(feedbackReports.id, id));
  });

  it("deletes the report when its reporter is deleted", async () => {
    const ghost = randomUUID();
    await db.execute(sql`insert into auth.users (id) values (${ghost})`);
    const id = await insertFeedback(report({ reporterId: ghost }));

    await db.execute(sql`delete from auth.users where id = ${ghost}`);

    const stored = await db.query.feedbackReports.findFirst({
      where: eq(feedbackReports.id, id),
    });
    expect(stored).toBeUndefined();
  });
});

describe("recentFeedbackCount", () => {
  it("counts only this reporter's rows inside the window", async () => {
    const now = new Date();
    const ids: string[] = [];
    ids.push(await insertFeedback(report()));
    ids.push(await insertFeedback(report()));
    ids.push(await insertFeedback(report({ reporterId: bob })));

    // Age one of Alice's rows out of the window.
    await db
      .update(feedbackReports)
      .set({ createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) })
      .where(eq(feedbackReports.id, ids[0]));

    const since = new Date(now.getTime() - 60 * 60 * 1000);
    expect(await recentFeedbackCount(alice, since)).toBe(1);
    expect(await recentFeedbackCount(bob, since)).toBe(1);

    for (const id of ids) {
      await db.delete(feedbackReports).where(eq(feedbackReports.id, id));
    }
  });

  it("returns 0 for a reporter with no rows", async () => {
    expect(await recentFeedbackCount(randomUUID(), new Date(0))).toBe(0);
  });
});

// The app reaches Postgres as a superuser and RLS is bypassed there, so these
// assertions switch to `anon` inside a transaction — the role a leaked
// publishable key would get.
//
// Two mechanisms can deny anon, and which one applies depends on the
// environment: where Supabase's default privileges granted anon table access
// (a long-lived local stack, and production) RLS is what stops it; on a stack
// where the grant was never issued (CI's fresh `supabase db reset`) it is
// denied before RLS is consulted. Asserting one specific message would test
// the environment, not the table — so these assert the property: anon can
// neither read a row nor write one.
const DENIED = /row-level security|permission denied/;

type AnonResult<T> = { ok: true; value: T } | { ok: false; message: string };

async function asAnon<T>(
  run: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<AnonResult<T>> {
  try {
    const value = await db.transaction(async (tx) => {
      await tx.execute(sql`set local role anon`);
      return run(tx);
    });
    return { ok: true, value };
  } catch (error) {
    // Drizzle wraps the driver error; the denial is the cause.
    const cause = (error as Error).cause as Error | undefined;
    return { ok: false, message: cause?.message ?? (error as Error).message };
  }
}

describe("row level security", () => {
  it("never lets anon observe a row", async () => {
    const id = await insertFeedback(report());

    const result = await asAnon((tx) =>
      tx.execute<{ count: string }>(
        sql`select count(*)::text as count from feedback_reports`,
      ),
    );
    if (result.ok) {
      expect(result.value[0].count).toBe("0");
    } else {
      expect(result.message).toMatch(DENIED);
    }

    await db.delete(feedbackReports).where(eq(feedbackReports.id, id));
  });

  it("rejects an anon insert", async () => {
    const result = await asAnon((tx) =>
      tx.execute(
        sql`insert into feedback_reports (kind, title, body, path, user_agent, reporter_id, reporter_role)
            values ('bug', 't', 'body text', '/', 'ua', ${alice}, 'player')`,
      ),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(DENIED);
    }
  });
});
