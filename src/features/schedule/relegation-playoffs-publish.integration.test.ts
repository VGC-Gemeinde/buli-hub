import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  disputes,
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

// "Relegation und Playoffs veröffentlichen" against local Postgres
// (docs/plans/relegation-and-playoffs.md): the checklist gate, what the click
// writes, the lock of the regular season (actions and trigger), staff orders
// and tiebreaker results filling their seats.

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

const {
  createRelegationPlayoffsSchedule,
  publishRelegationPlayoffs,
  setTieOrder,
} = await import("./actions");
const { syncSeats } = await import("./relegation-playoffs-setup");
const { awardFreeWin } = await import("@/features/reporting/staff-actions");
const { dropPlayer } = await import("@/features/drops/actions");
const { holdMatch } = await import("@/features/recordings/actions");

const staff = randomUUID();
// Division 1: one group of four. a1 beats everyone; a2 > a3 > a4 > a2 is a
// cycle, so a2, a3, a4 share place 2 across both the title and the
// relegation boundary: a staff order.
const a = Array.from({ length: 4 }, () => randomUUID());
// Division 2, decided by its Gesamttabelle: two groups of two, each won 2:0,
// so the two winners tie for the one relegation seat: a tiebreaker.
const [p, q, r, s] = Array.from({ length: 4 }, () => randomUUID());
const everyone = [staff, ...a, p, q, r, s];
let windowId: string;
let regularMatch: string;

async function stageMatches(stage: "relegation" | "playoff" | "tiebreaker") {
  return db
    .select({
      id: matches.id,
      a: matches.playerAId,
      b: matches.playerBId,
      tieKey: matches.tieKey,
    })
    .from(matches)
    .where(and(eq(matches.windowId, windowId), eq(matches.stage, stage)));
}

const asStaff = () =>
  currentUserMock.mockResolvedValue({ userId: staff, role: "staff" });

beforeAll(async () => {
  await db.execute(sql`delete from registration_windows`);
  await db.execute(
    sql`insert into auth.users (id) values ${sql.join(
      everyone.map((id) => sql`(${id})`),
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
    subDivisionSize: 4,
    replayRequiredTiers: 0,
    finalizedAt: new Date("2026-08-05T00:00:00Z"),
  });
  const [d1, d2] = await db
    .insert(divisions)
    .values([
      {
        windowId,
        tier: 1,
        championshipPlayoffSlots: 2,
        demotionPlayoffSlots: 1,
      },
      {
        windowId,
        tier: 2,
        relevantTable: "division",
        promotionPlayoffSlots: 1,
      },
    ])
    .returning({ id: divisions.id });
  const [g1, g2a, g2b] = await db
    .insert(subDivisions)
    .values([
      { divisionId: d1.id, position: 0 },
      { divisionId: d2.id, position: 0 },
      { divisionId: d2.id, position: 1 },
    ])
    .returning({ id: subDivisions.id });
  await db.insert(placements).values([
    ...a.map((userId) => ({
      windowId,
      userId,
      divisionId: d1.id,
      subDivisionId: g1.id,
    })),
    { windowId, userId: p, divisionId: d2.id, subDivisionId: g2a.id },
    { windowId, userId: q, divisionId: d2.id, subDivisionId: g2a.id },
    { windowId, userId: r, divisionId: d2.id, subDivisionId: g2b.id },
    { windowId, userId: s, divisionId: d2.id, subDivisionId: g2b.id },
  ]);
  const won = async (
    group: string,
    winner: string,
    loser: string,
    round: number,
  ) => {
    const [match] = await db
      .insert(matches)
      .values({
        windowId,
        subDivisionId: group,
        round,
        playerAId: winner,
        playerBId: loser,
      })
      .returning({ id: matches.id });
    await db.insert(matchResults).values({
      matchId: match.id,
      outcome: "free_win",
      winnerId: winner,
      reportedById: staff,
      confirmedById: staff,
      confirmedAt: new Date("2026-08-20T00:00:00Z"),
    });
    return match.id;
  };
  regularMatch = await won(g1.id, a[0], a[1], 1);
  await won(g1.id, a[0], a[2], 2);
  await won(g1.id, a[0], a[3], 3);
  await won(g1.id, a[1], a[2], 1);
  await won(g1.id, a[2], a[3], 2);
  await won(g1.id, a[3], a[1], 3);
  await won(g2a.id, p, q, 1);
  await won(g2b.id, r, s, 1);
  await db.insert(matchdays).values(
    [1, 2, 3].map((round) => ({
      windowId,
      round,
      startsOn: `2026-08-${String(10 + (round - 1) * 7).padStart(2, "0")}`,
      endsOn: `2026-08-${String(16 + (round - 1) * 7).padStart(2, "0")}`,
    })),
  );
  asStaff();
  const created = await createRelegationPlayoffsSchedule({
    deadlines: ["2026-09-06"],
  });
  if (!created.ok) throw new Error(created.error);
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  await db.execute(
    sql`delete from auth.users where id in ${sql.raw(
      `(${everyone.map((id) => `'${id}'`).join(",")})`,
    )}`,
  );
});

describe("publishing", () => {
  it("is refused while the regular season has open points", async () => {
    const [dispute] = await db
      .insert(disputes)
      .values({ matchId: regularMatch, openedById: a[1], reason: "Falsch" })
      .returning({ id: disputes.id });
    asStaff();
    const refused = await publishRelegationPlayoffs();
    expect(refused).toEqual({
      ok: false,
      error: "Erst klären: 1 Ergebnis ist angefochten.",
    });
    await db.delete(disputes).where(eq(disputes.id, dispute.id));
  });

  it("writes nothing into the matches before it", async () => {
    for (const match of await stageMatches("relegation")) {
      expect([match.a, match.b]).toEqual([null, null]);
    }
  });

  it("closes the regular season, creates the tiebreaker, writes known seats", async () => {
    asStaff();
    expect(await publishRelegationPlayoffs()).toEqual({ ok: true });

    const [window] = await db
      .select({ closedAt: registrationWindows.regularSeasonClosedAt })
      .from(registrationWindows)
      .where(eq(registrationWindows.id, windowId));
    expect(window.closedAt).not.toBeNull();

    const tiebreakers = await stageMatches("tiebreaker");
    expect(tiebreakers).toHaveLength(1);
    expect(new Set([tiebreakers[0].a, tiebreakers[0].b])).toEqual(
      new Set([p, r]),
    );

    // The final: a1 is seed 1; seed 2 waits for the staff order.
    const [final] = await stageMatches("playoff");
    expect([final.a, final.b]).toEqual([a[0], null]);
    // The relegation: both seats wait (staff order above, tiebreaker below).
    const [relegation] = await stageMatches("relegation");
    expect([relegation.a, relegation.b]).toEqual([null, null]);
  });

  it("runs only once", async () => {
    asStaff();
    expect(await publishRelegationPlayoffs()).toEqual({
      ok: false,
      error: "Relegation und Playoffs sind bereits veröffentlicht",
    });
  });
});

describe("the closed regular season", () => {
  it("refuses staff result tools", async () => {
    asStaff();
    expect(
      await awardFreeWin({
        matchId: regularMatch,
        winnerId: a[1],
        reason: "Test",
      } as never),
    ).toEqual({
      ok: false,
      error:
        "Die reguläre Saison ist abgeschlossen. Ihre Ergebnisse sind endgültig.",
    });
  });

  it("refuses drops and holds", async () => {
    asStaff();
    expect(await dropPlayer({ userId: a[3], reason: "Test" })).toMatchObject({
      ok: false,
    });
    expect(await holdMatch({ matchId: regularMatch })).toMatchObject({
      ok: false,
    });
    expect(
      await db
        .select()
        .from(recordingHolds)
        .where(eq(recordingHolds.matchId, regularMatch)),
    ).toEqual([]);
  });

  it("is enforced by the database whatever path a write takes", async () => {
    await expect(
      db
        .update(matchResults)
        .set({ winnerId: a[1] })
        .where(eq(matchResults.matchId, regularMatch)),
    ).rejects.toThrow();
    await expect(
      db
        .insert(disputes)
        .values({ matchId: regularMatch, openedById: a[1], reason: "x" }),
    ).rejects.toThrow();
  });
});

describe("deciding the shared places", () => {
  it("seats the staff order", async () => {
    asStaff();
    const tieKey = `group:${
      (
        await db
          .select({ id: placements.subDivisionId })
          .from(placements)
          .where(eq(placements.userId, a[0]))
      )[0].id
    }:1`;
    expect(
      await setTieOrder({
        tieKey,
        order: [a[2], a[1], a[3]],
        reason: "Turnier",
      }),
    ).toEqual({ ok: true });
    const [final] = await stageMatches("playoff");
    expect([final.a, final.b]).toEqual([a[0], a[2]]);
    const [relegation] = await stageMatches("relegation");
    expect(relegation.a).toBe(a[3]);
  });

  it("refuses an order that does not name exactly the tied players", async () => {
    asStaff();
    const [tiebreaker] = await stageMatches("tiebreaker");
    expect(
      await setTieOrder({
        tieKey: tiebreaker.tieKey,
        order: [p, r, q],
        reason: "x",
      }),
    ).toMatchObject({ ok: false });
  });

  it("seats the tiebreaker's winner", async () => {
    const [tiebreaker] = await stageMatches("tiebreaker");
    await db.insert(matchResults).values({
      matchId: tiebreaker.id,
      outcome: "free_win",
      winnerId: r,
      reportedById: staff,
      confirmedById: staff,
      confirmedAt: new Date(),
    });
    await syncSeats(windowId);
    const [relegation] = await stageMatches("relegation");
    expect([relegation.a, relegation.b]).toEqual([a[3], r]);
  });
});

describe("playing Relegation und Playoffs", () => {
  let staffActions: typeof import("@/features/reporting/staff-actions");
  let reportActions: typeof import("@/features/reporting/actions");
  let dropActions: typeof import("@/features/drops/actions");
  let recordingActions: typeof import("@/features/recordings/actions");

  beforeAll(async () => {
    staffActions = await import("@/features/reporting/staff-actions");
    reportActions = await import("@/features/reporting/actions");
    dropActions = await import("@/features/drops/actions");
    recordingActions = await import("@/features/recordings/actions");
    await db.execute(
      sql`insert into regelwerk_acceptances (window_id, user_id) values ${sql.join(
        [...a, p, q, r, s].map((id) => sql`(${windowId}, ${id})`),
        sql`, `,
      )}`,
    );
  });

  const asPlayer = (userId: string) =>
    currentUserMock.mockResolvedValue({
      userId,
      role: "player",
      guildMember: true,
    });

  it("moves the seat when a tiebreaker result changes before anything builds on it", async () => {
    asStaff();
    const [tiebreaker] = await stageMatches("tiebreaker");
    expect(await staffActions.reopenMatch(tiebreaker.id)).toEqual({ ok: true });
    let [relegation] = await stageMatches("relegation");
    expect(relegation.b).toBeNull();
    expect(
      await staffActions.awardFreeWin({
        matchId: tiebreaker.id,
        winnerId: p,
        reason: "Nicht angetreten",
      }),
    ).toEqual({ ok: true });
    [relegation] = await stageMatches("relegation");
    expect(relegation.b).toBe(p);
  });

  it("refuses a report while the tiebreaker it builds on is withheld", async () => {
    const [tiebreaker] = await stageMatches("tiebreaker");
    const [relegation] = await stageMatches("relegation");
    await db
      .insert(recordingHolds)
      .values({ matchId: tiebreaker.id, windowId, round: 4, heldById: staff });
    asStaff();
    expect(
      await staffActions.awardFreeWin({
        matchId: relegation.id,
        winnerId: a[3],
        reason: "x",
      }),
    ).toMatchObject({ ok: false });
    // Held itself, it may get its result, but not go public first.
    await db
      .insert(recordingHolds)
      .values({ matchId: relegation.id, windowId, round: 4, heldById: staff });
    expect(
      await recordingActions.releaseHold({ matchId: relegation.id }),
    ).toMatchObject({ ok: false });
    await db
      .delete(recordingHolds)
      .where(eq(recordingHolds.matchId, tiebreaker.id));
    expect(
      await recordingActions.releaseHold({ matchId: relegation.id }),
    ).toEqual({ ok: true });
  });

  it("locks a tiebreaker's outcome once the match it seats has a result", async () => {
    const [relegation] = await stageMatches("relegation");
    const [tiebreaker] = await stageMatches("tiebreaker");
    asStaff();
    expect(
      await staffActions.awardFreeWin({
        matchId: relegation.id,
        winnerId: p,
        reason: "Nicht angetreten",
      }),
    ).toEqual({ ok: true });
    expect(
      await staffActions.awardFreeWin({
        matchId: tiebreaker.id,
        winnerId: r,
        reason: "Doch anders",
      }),
    ).toEqual({ ok: false, error: expect.stringMatching(/aufbaut/) });
    // The same outcome again is no change and goes through.
    expect(
      await staffActions.awardFreeWin({
        matchId: tiebreaker.id,
        winnerId: p,
        reason: "Begründung präzisiert",
      }),
    ).toEqual({ ok: true });
  });

  it("decides an open match by a late drop, and takes it back", async () => {
    const [final] = await stageMatches("playoff");
    asStaff();
    expect(
      await dropActions.lateDropPlayer({ userId: a[2], reason: "Aufgehört" }),
    ).toEqual({ ok: true });
    asPlayer(a[0]);
    expect(
      await reportActions.reportMatch({ matchId: final.id, report: {} }),
    ).toEqual({
      ok: false,
      error: "Das Match wurde durch einen Drop entschieden",
    });
    asStaff();
    expect(await dropActions.undoLateDrop({ userId: a[2] })).toEqual({
      ok: true,
    });
  });

  it("refuses a late drop for someone without an open match", async () => {
    asStaff();
    expect(
      await dropActions.lateDropPlayer({ userId: q, reason: "x" }),
    ).toMatchObject({ ok: false });
  });
});
