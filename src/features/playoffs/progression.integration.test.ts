import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  divisions,
  matchdays,
  matches,
  matchResults,
  placements,
  recordingHolds,
  registrationWindows,
  seedings,
  subDivisions,
} from "@/db/schema";
import { db } from "@/lib/db";

// The Playoffs bracket moving on (docs/plans/relegation-and-playoffs.md):
// each semi-final's winner reaches the final, a semi-final lost by both
// gives the final away without a match, a result that something builds on
// is locked, and a withheld semi-final holds the final back.

const { currentUserMock } = vi.hoisted(() => ({ currentUserMock: vi.fn() }));
vi.mock("@/features/roles/guard", () => ({ currentUser: currentUserMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/discord-season/converge", () => ({
  syncSeasonDiscord: vi.fn(),
}));
vi.mock("@/features/discord-posts/sync", () => ({
  syncResultPost: vi.fn(),
  syncMotwVodPost: vi.fn(),
}));

const { createRelegationPlayoffsSchedule, publishRelegationPlayoffs } =
  await import("@/features/schedule/actions");
const { awardFreeWin, awardDoubleLoss, reopenMatch } = await import(
  "@/features/reporting/staff-actions"
);
const { relegationPlayoffsResolved } = await import(
  "@/features/schedule/relegation-playoffs-setup"
);

const staff = randomUUID();
// One division, one table of five, four title seats: p1 > p2 > p3 > p4 > p5.
const p = Array.from({ length: 5 }, () => randomUUID());
let windowId: string;

const asStaff = () =>
  currentUserMock.mockResolvedValue({ userId: staff, role: "staff" });

async function playoff(round: number, position: number) {
  const [row] = await db
    .select({ id: matches.id, a: matches.playerAId, b: matches.playerBId })
    .from(matches)
    .where(
      and(
        eq(matches.windowId, windowId),
        eq(matches.stage, "playoff"),
        eq(matches.round, round),
        eq(matches.position, position),
      ),
    );
  return row;
}

beforeAll(async () => {
  await db.execute(sql`delete from registration_windows`);
  await db.execute(
    sql`insert into auth.users (id) values ${sql.join(
      [staff, ...p].map((id) => sql`(${id})`),
      sql`, `,
    )}`,
  );
  const [window] = await db
    .insert(registrationWindows)
    .values({
      openedBy: staff,
      closesAt: new Date("2026-08-01T00:00:00Z"),
      openedAt: new Date("2026-07-20T00:00:00Z"),
      seasonNumber: 9,
      schedulePublishedAt: new Date("2026-08-10T00:00:00Z"),
    })
    .returning({ id: registrationWindows.id });
  windowId = window.id;
  await db.insert(seedings).values({
    windowId,
    subDivisionSize: 5,
    replayRequiredTiers: 0,
    finalizedAt: new Date("2026-08-05T00:00:00Z"),
  });
  const [division] = await db
    .insert(divisions)
    .values({ windowId, tier: 1, championshipPlayoffSlots: 4 })
    .returning({ id: divisions.id });
  const [group] = await db
    .insert(subDivisions)
    .values({ divisionId: division.id, position: 0 })
    .returning({ id: subDivisions.id });
  await db.insert(placements).values(
    p.map((userId) => ({
      windowId,
      userId,
      divisionId: division.id,
      subDivisionId: group.id,
    })),
  );
  let round = 0;
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) {
      const [match] = await db
        .insert(matches)
        .values({
          windowId,
          subDivisionId: group.id,
          round: (round++ % 2) + 1,
          playerAId: p[i],
          playerBId: p[j],
        })
        .returning({ id: matches.id });
      await db.insert(matchResults).values({
        matchId: match.id,
        outcome: "free_win",
        winnerId: p[i],
        reportedById: staff,
        confirmedById: staff,
        confirmedAt: new Date("2026-08-20T00:00:00Z"),
      });
    }
  }
  await db.insert(matchdays).values([
    { windowId, round: 1, startsOn: "2026-08-10", endsOn: "2026-08-16" },
    { windowId, round: 2, startsOn: "2026-08-17", endsOn: "2026-08-23" },
  ]);
  asStaff();
  const created = await createRelegationPlayoffsSchedule({
    deadlines: ["2026-08-30", "2026-09-06"],
  });
  if (!created.ok) throw new Error(created.error);
  const published = await publishRelegationPlayoffs();
  if (!published.ok) throw new Error(published.error);
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  await db.execute(
    sql`delete from auth.users where id in ${sql.raw(
      `(${[staff, ...p].map((id) => `'${id}'`).join(",")})`,
    )}`,
  );
});

describe("the bracket", () => {
  it("seats the semi-finals and leaves the final open", async () => {
    const hf1 = await playoff(3, 0);
    const hf2 = await playoff(3, 1);
    const final = await playoff(4, 0);
    expect([hf1.a, hf1.b]).toEqual([p[0], p[3]]);
    expect([hf2.a, hf2.b]).toEqual([p[1], p[2]]);
    expect([final.a, final.b]).toEqual([null, null]);
  });

  it("moves each semi-final's winner into the final", async () => {
    asStaff();
    const hf1 = await playoff(3, 0);
    const hf2 = await playoff(3, 1);
    await awardFreeWin({ matchId: hf1.id, winnerId: p[3], reason: "x" });
    await awardFreeWin({ matchId: hf2.id, winnerId: p[1], reason: "x" });
    const final = await playoff(4, 0);
    expect([final.a, final.b]).toEqual([p[3], p[1]]);
  });

  it("follows a correction while the final is unplayed", async () => {
    asStaff();
    const hf1 = await playoff(3, 0);
    expect(
      await awardFreeWin({
        matchId: hf1.id,
        winnerId: p[0],
        reason: "Korrektur",
      }),
    ).toEqual({ ok: true });
    expect((await playoff(4, 0)).a).toBe(p[0]);
  });

  it("locks a semi-final once the final has a result", async () => {
    asStaff();
    const final = await playoff(4, 0);
    await awardFreeWin({ matchId: final.id, winnerId: p[0], reason: "x" });
    const hf1 = await playoff(3, 0);
    expect(
      await awardFreeWin({ matchId: hf1.id, winnerId: p[3], reason: "x" }),
    ).toMatchObject({ ok: false });
    expect(await reopenMatch(hf1.id)).toMatchObject({ ok: false });
    const state = await relegationPlayoffsResolved(windowId);
    expect(
      state?.resolved.find((m) => m.matchId === final.id)?.outcome,
    ).toEqual({ kind: "won", winnerId: p[0] });
  });

  it("gives the final away after a semi-final lost by both", async () => {
    asStaff();
    const final = await playoff(4, 0);
    expect(await reopenMatch(final.id)).toEqual({ ok: true });
    const hf1 = await playoff(3, 0);
    expect(await awardDoubleLoss({ matchId: hf1.id })).toEqual({ ok: true });
    const after = await playoff(4, 0);
    expect([after.a, after.b]).toEqual([null, p[1]]);
    const state = await relegationPlayoffsResolved(windowId);
    const resolved = state?.resolved.find((m) => m.matchId === final.id);
    expect(resolved?.a).toEqual({ kind: "vacant" });
    expect(resolved?.outcome).toEqual({ kind: "won", winnerId: p[1] });
  });

  it("holds the final back while a semi-final is withheld", async () => {
    asStaff();
    const hf1 = await playoff(3, 0);
    const hf2 = await playoff(3, 1);
    await awardFreeWin({ matchId: hf1.id, winnerId: p[0], reason: "x" });
    await db
      .insert(recordingHolds)
      .values({ matchId: hf2.id, windowId, round: 3, heldById: staff });
    const final = await playoff(4, 0);
    expect(
      await awardFreeWin({ matchId: final.id, winnerId: p[0], reason: "x" }),
    ).toMatchObject({ ok: false });
  });
});

describe("completing the season", () => {
  let completeSeason: typeof import("@/features/schedule/actions").completeSeason;
  beforeAll(async () => {
    ({ completeSeason } = await import("@/features/schedule/actions"));
  });

  it("is refused while something is withheld or undecided", async () => {
    asStaff();
    expect(await completeSeason()).toMatchObject({ ok: false });
  });

  it("writes every outcome and the champion, then locks everything", async () => {
    await db
      .delete(recordingHolds)
      .where(eq(recordingHolds.windowId, windowId));
    asStaff();
    const hf2 = await playoff(3, 1);
    await awardFreeWin({ matchId: hf2.id, winnerId: p[1], reason: "x" });
    const final = await playoff(4, 0);
    await awardFreeWin({ matchId: final.id, winnerId: p[1], reason: "x" });

    expect(await completeSeason()).toEqual({ ok: true });
    const rows = await db
      .select({
        userId: placements.userId,
        outcome: placements.seasonOutcome,
        champion: placements.champion,
      })
      .from(placements)
      .where(eq(placements.windowId, windowId));
    expect(rows.every((row) => row.outcome === "stays")).toBe(true);
    expect(rows.filter((row) => row.champion).map((row) => row.userId)).toEqual(
      [p[1]],
    );

    expect(
      await awardFreeWin({ matchId: final.id, winnerId: p[0], reason: "x" }),
    ).toEqual({
      ok: false,
      error: "Die Saison ist abgeschlossen. Ihre Ergebnisse sind endgültig.",
    });
    await expect(
      db
        .update(matchResults)
        .set({ winnerId: p[0] })
        .where(eq(matchResults.matchId, final.id)),
    ).rejects.toThrow();
    expect(await completeSeason()).toMatchObject({ ok: false });
  });
});
