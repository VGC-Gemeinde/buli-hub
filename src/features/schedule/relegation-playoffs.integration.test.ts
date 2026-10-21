import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  divisions,
  matchdays,
  matches,
  matchResults,
  placements,
  registrationWindows,
  seedings,
  subDivisions,
} from "@/db/schema";
import { db } from "@/lib/db";

// "Spielplan für Relegation und Playoffs erstellen" against local Postgres
// (docs/plans/relegation-and-playoffs-1-schedule.md): the gate, what it
// creates, that nothing it creates shows up for the readers of the regular
// season, and the live preview read from the standings.

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

const { createRelegationPlayoffsSchedule } = await import("./actions");
const { relegationPlayoffsState, relegationPlayoffsSides } = await import(
  "./relegation-playoffs-setup"
);
const { confirmMotw, nominateMotwCandidate } = await import(
  "@/features/motw/actions"
);
const { holdsForWindow } = await import("@/features/recordings/queries");
const { matchSelectionContext } = await import("@/features/motw/queries");
const { sidesChanged } = await import("./relegation-playoffs-sides");
const { matchdaysForWindow, allMatchdaysForWindow, subDivisionMatches } =
  await import("@/features/season/queries");
const { windowMatchOverview } = await import("@/features/reporting/queries");

const staff = randomUUID();
// Two divisions of two groups of four. In each group the players are listed
// best first: every match goes to the earlier one.
const groups = {
  "1a": Array.from({ length: 4 }, () => randomUUID()),
  "1b": Array.from({ length: 4 }, () => randomUUID()),
  "2a": Array.from({ length: 4 }, () => randomUUID()),
  "2b": Array.from({ length: 4 }, () => randomUUID()),
};
const players = Object.values(groups).flat();
let windowId: string;
const groupIds = new Map<string, string>();
const regularMatchIds: string[] = [];

const asStaff = () =>
  currentUserMock.mockResolvedValue({ userId: staff, role: "staff" });

beforeAll(async () => {
  await db.execute(sql`delete from registration_windows`);
  await db.execute(
    sql`insert into users (id, discord_id) values ${sql.join(
      [staff, ...players].map((id) => sql`(${id}, ${id})`),
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
      { windowId, tier: 2, promotionPlayoffSlots: 1 },
    ])
    .returning({ id: divisions.id, tier: divisions.tier });

  // Group lots fixed so the pairings are predictable: 1b and 2a draw first.
  const lots: Record<string, number> = {
    "1a": 0.6,
    "1b": 0.2,
    "2a": 0.1,
    "2b": 0.9,
  };
  for (const [name, members] of Object.entries(groups)) {
    const division = name.startsWith("1") ? d1 : d2;
    const [group] = await db
      .insert(subDivisions)
      .values({
        divisionId: division.id,
        position: name.endsWith("a") ? 0 : 1,
        lotNumber: lots[name],
      })
      .returning({ id: subDivisions.id });
    groupIds.set(name, group.id);
    await db.insert(placements).values(
      members.map((userId) => ({
        windowId,
        userId,
        divisionId: division.id,
        subDivisionId: group.id,
      })),
    );
    // Round robin, every match won by the better-listed player.
    let round = 1;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const [match] = await db
          .insert(matches)
          .values({
            windowId,
            subDivisionId: group.id,
            round: (round++ % 3) + 1,
            playerAId: members[i],
            playerBId: members[j],
          })
          .returning({ id: matches.id });
        regularMatchIds.push(match.id);
        await db.insert(matchResults).values({
          matchId: match.id,
          outcome: "normal",
          winnerId: members[i],
          platform: "showdown",
          reportedById: members[i],
        });
      }
    }
  }
  await db.insert(matchdays).values(
    [1, 2, 3].map((round) => ({
      windowId,
      round,
      startsOn: `2026-08-${String(10 + (round - 1) * 7).padStart(2, "0")}`,
      endsOn: `2026-08-${String(16 + (round - 1) * 7).padStart(2, "0")}`,
    })),
  );
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  await db.execute(
    sql`delete from users where id in ${sql.raw(
      `(${[staff, ...players].map((id) => `'${id}'`).join(",")})`,
    )}`,
  );
});

describe("lots", () => {
  it("draws a lot for every placement on insert", async () => {
    const rows = await db
      .select({ lot: placements.lotNumber })
      .from(placements)
      .where(eq(placements.windowId, windowId));
    expect(rows).toHaveLength(16);
    expect(new Set(rows.map((row) => row.lot)).size).toBe(16);
    for (const row of rows) {
      expect(row.lot).toBeGreaterThanOrEqual(0);
      expect(row.lot).toBeLessThan(1);
    }
  });
});

describe("createRelegationPlayoffsSchedule", () => {
  it("is staff only", async () => {
    currentUserMock.mockResolvedValue({ userId: players[0], role: "player" });
    expect(
      await createRelegationPlayoffsSchedule({ deadlines: ["2026-09-06"] }),
    ).toEqual({ ok: false, error: "Keine Berechtigung" });
  });

  it("wants one deadline per week, the first after the last Spieltag", async () => {
    asStaff();
    expect(
      await createRelegationPlayoffsSchedule({ deadlines: ["2026-09-06"] }),
    ).toMatchObject({ ok: false });
    expect(
      await createRelegationPlayoffsSchedule({
        deadlines: ["2026-08-30", "2026-09-06"],
      }),
    ).toEqual({
      ok: false,
      error: "Die erste Woche muss nach dem letzten Spieltag enden",
    });
  });

  it("creates the weeks and the matches without players", async () => {
    asStaff();
    expect(
      await createRelegationPlayoffsSchedule({
        deadlines: ["2026-09-06", "2026-09-13"],
      }),
    ).toEqual({ ok: true });

    const weeks = await allMatchdaysForWindow(windowId);
    expect(weeks.filter((week) => !week.regular)).toEqual([
      {
        round: 4,
        startsOn: "2026-08-31",
        endsOn: "2026-09-06",
        regular: false,
      },
      {
        round: 5,
        startsOn: "2026-09-07",
        endsOn: "2026-09-13",
        regular: false,
      },
    ]);

    const created = await db
      .select({
        stage: matches.stage,
        tier: matches.tier,
        position: matches.position,
        round: matches.round,
        a: matches.playerAId,
        b: matches.playerBId,
        group: matches.subDivisionId,
      })
      .from(matches)
      .where(and(eq(matches.windowId, windowId), sql`stage <> 'regular'`))
      .orderBy(matches.stage, matches.round, matches.position);
    expect(created).toEqual([
      {
        stage: "relegation",
        tier: 1,
        position: 0,
        round: 4,
        a: null,
        b: null,
        group: null,
      },
      {
        stage: "relegation",
        tier: 1,
        position: 1,
        round: 4,
        a: null,
        b: null,
        group: null,
      },
      {
        stage: "playoff",
        tier: 1,
        position: 0,
        round: 4,
        a: null,
        b: null,
        group: null,
      },
      {
        stage: "playoff",
        tier: 1,
        position: 1,
        round: 4,
        a: null,
        b: null,
        group: null,
      },
      {
        stage: "playoff",
        tier: 1,
        position: 0,
        round: 5,
        a: null,
        b: null,
        group: null,
      },
    ]);
  });

  it("runs only once", async () => {
    asStaff();
    expect(
      await createRelegationPlayoffsSchedule({
        deadlines: ["2026-09-06", "2026-09-13"],
      }),
    ).toEqual({ ok: false, error: "Der Spielplan wurde bereits erstellt" });
  });
});

describe("the regular season's readers", () => {
  it("count only the regular Spieltage", async () => {
    expect((await matchdaysForWindow(windowId)).map((d) => d.round)).toEqual([
      1, 2, 3,
    ]);
  });

  it("do not see the new matches", async () => {
    const overview = await windowMatchOverview(windowId);
    expect(overview.map((m) => m.matchId).sort()).toEqual(
      [...regularMatchIds].sort(),
    );
    const groupMatches = await subDivisionMatches(groupIds.get("1a") ?? "");
    expect(groupMatches).toHaveLength(6);
  });
});

describe("relegationPlayoffsState", () => {
  it("previews who plays whom by the current table", async () => {
    const state = await relegationPlayoffsState(windowId);
    if (state.kind !== "created") throw new Error("not created");
    const { preview } = state;
    const holder = (
      side: (typeof preview.relegation)[number]["matches"][number]["a"],
    ) =>
      side.kind === "seat" && side.holder.kind === "player"
        ? side.holder.userId
        : null;

    // Relegation: worst Division-1 seat (1b before 1a by lot) against the
    // best Division-2 seat (2a before 2b by lot).
    expect(preview.relegation).toHaveLength(1);
    const [first, second] = preview.relegation[0].matches;
    expect(holder(first.a)).toBe(groups["1b"][3]);
    expect(holder(first.b)).toBe(groups["2a"][0]);
    expect(holder(second.a)).toBe(groups["1a"][3]);
    expect(holder(second.b)).toBe(groups["2b"][0]);

    // Playoffs: seeds 1b1, 1a1, then the runners-up kept apart from their
    // own group's winner: 1 1b1 - 4 1a2, 2 1a1 - 3 1b2.
    if (!Array.isArray(preview.playoffs)) throw new Error("no bracket");
    const [semis] = preview.playoffs;
    expect(semis.matches.map((m) => [holder(m.a), holder(m.b)])).toEqual([
      [groups["1b"][0], groups["1a"][1]],
      [groups["1a"][0], groups["1b"][1]],
    ]);
    expect(preview.ties).toEqual([]);
  });
});

describe("Match of the Week on an unpublished relegation match", () => {
  // The last regular Spieltag is running; the relegation week comes next.
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-28T12:00:00Z"));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  async function firstRelegationMatch(): Promise<string> {
    const [row] = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.windowId, windowId),
          eq(matches.stage, "relegation"),
          eq(matches.position, 0),
        ),
      );
    return row.id;
  }

  it("is no bye although its players are not set", async () => {
    const context = await matchSelectionContext(await firstRelegationMatch());
    expect(context).toMatchObject({
      stage: "relegation",
      playerAId: null,
      playerBId: null,
      isBye: false,
    });
  });

  it("can be nominated and remembers its line-up", async () => {
    asStaff();
    const matchId = await firstRelegationMatch();
    expect(await nominateMotwCandidate({ matchId, role: "primary" })).toEqual({
      ok: true,
    });
    const hold = (await holdsForWindow(windowId)).find(
      (h) => h.matchId === matchId,
    );
    expect(hold).toMatchObject({
      round: 4,
      motwRole: "primary",
      nominatedSides: { a: [groups["1b"][3]], b: [groups["2a"][0]] },
    });
  });

  it("cannot be confirmed before the pairings are published", async () => {
    asStaff();
    expect(
      await confirmMotw({ matchId: await firstRelegationMatch() }),
    ).toMatchObject({ ok: false });
  });

  it("notices when a correction moves who plays it", async () => {
    // Division 2a's top two swap: the second-listed player now wins their
    // match, and with it the head-to-head between two players on two wins.
    const [top, second] = groups["2a"];
    const [match] = await db
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.playerAId, top), eq(matches.playerBId, second)));
    await db
      .update(matchResults)
      .set({ winnerId: second })
      .where(eq(matchResults.matchId, match.id));

    const matchId = await firstRelegationMatch();
    const hold = (await holdsForWindow(windowId)).find(
      (h) => h.matchId === matchId,
    );
    const { matches: sides } = await relegationPlayoffsSides(windowId);
    const current = sides.find((m) => m.matchId === matchId);
    if (!hold?.nominatedSides || !current) throw new Error("missing");
    expect(current.b.candidates).toEqual([second]);
    expect(sidesChanged(hold.nominatedSides, current)).toBe(true);
  });
});
