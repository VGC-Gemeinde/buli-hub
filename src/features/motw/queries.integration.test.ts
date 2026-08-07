import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  divisions,
  matchdays,
  matches,
  matchGames,
  matchResults,
  motwSelections,
  placements,
  profiles,
  subDivisions,
} from "@/db/schema";
import { createWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import {
  deleteMotw,
  matchSelectionContext,
  motwByMatchId,
  motwForWindow,
  profileFlags,
  setMotwYoutubeUrl,
  upsertMotw,
  windowPlayerForm,
} from "./queries";

const alice = randomUUID();
const bob = randomUUID();
const carol = randomUUID();
const dave = randomUUID();
const erin = randomUUID();
const frank = randomUUID();
const gina = randomUUID();
const staff = randomUUID();
let windowId: string;
let matchR1: string; // alice vs bob, round 1
let matchR2: string; // alice vs bob, round 2
let matchBye: string; // carol bye, round 1

beforeAll(async () => {
  for (const id of [alice, bob, carol, dave, erin, frank, gina, staff]) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }

  await createWindow(new Date("2026-06-30T18:00:00Z"), staff, 1);
  const rows = await db.execute<{ id: string }>(
    sql`select id from registration_windows where opened_by = ${staff}`,
  );
  windowId = rows[0].id;

  const [division] = await db
    .insert(divisions)
    .values({ windowId, tier: 1 })
    .returning({ id: divisions.id });
  const [subDivision] = await db
    .insert(subDivisions)
    .values({ divisionId: division.id, position: 0 })
    .returning({ id: subDivisions.id });
  await db.insert(matchdays).values([
    { windowId, round: 1, startsOn: "2026-07-01", endsOn: "2026-07-07" },
    { windowId, round: 2, startsOn: "2026-07-08", endsOn: "2026-07-14" },
  ]);

  const inserted = await db
    .insert(matches)
    .values([
      {
        subDivisionId: subDivision.id,
        round: 1,
        playerAId: alice,
        playerBId: bob,
      },
      {
        subDivisionId: subDivision.id,
        round: 2,
        playerAId: alice,
        playerBId: bob,
      },
      {
        subDivisionId: subDivision.id,
        round: 1,
        playerAId: carol,
        playerBId: null,
      },
    ])
    .returning({
      id: matches.id,
      round: matches.round,
      playerBId: matches.playerBId,
    });
  matchR1 =
    inserted.find((m) => m.round === 1 && m.playerBId !== null)?.id ?? "";
  matchR2 = inserted.find((m) => m.round === 2)?.id ?? "";
  matchBye = inserted.find((m) => m.playerBId === null)?.id ?? "";

  // Placements + a confirmed result, so `windowPlayerForm` has a table to
  // compute: alice beat bob 2:0 in round 1, carol had the bye.
  await db.insert(placements).values(
    [alice, bob, carol].map((userId) => ({
      windowId,
      userId,
      divisionId: division.id,
      subDivisionId: subDivision.id,
    })),
  );
  const edited = new Date("2026-07-01T10:00:00Z");
  await db.insert(profiles).values([
    {
      userId: alice,
      displayName: "Alice",
      hasCaptureCard: true,
      settingsEditedAt: edited,
    },
    {
      userId: bob,
      displayName: "Bob",
      hasCaptureCard: false,
      settingsEditedAt: edited,
    },
    // Never saved her settings. Her `false` is the column default, which is
    // why `edited` has to be reported alongside it: Bob answered "no", Carol
    // never answered at all.
    { userId: carol, displayName: "Carol", hasCaptureCard: false },
  ]);
  await db.insert(matchResults).values({
    matchId: matchR1,
    outcome: "normal",
    winnerId: alice,
    platform: "cartridge",
    reportedById: alice,
    confirmedAt: new Date(),
  });
  await db.insert(matchGames).values([
    { matchId: matchR1, gameNumber: 1, winnerId: alice },
    { matchId: matchR1, gameNumber: 2, winnerId: alice },
  ]);

  // A second division in "division" mode with two equal groups — the case
  // where the merged Gesamttabelle, not the group table, decides a placement.
  const [division2] = await db
    .insert(divisions)
    .values({ windowId, tier: 2, relevantTable: "division" })
    .returning({ id: divisions.id });
  const subs2 = await db
    .insert(subDivisions)
    .values([
      { divisionId: division2.id, position: 0 },
      { divisionId: division2.id, position: 1 },
    ])
    .returning({ id: subDivisions.id, position: subDivisions.position });
  await db.insert(placements).values([
    {
      windowId,
      userId: dave,
      divisionId: division2.id,
      subDivisionId: subs2[0].id,
    },
    {
      windowId,
      userId: erin,
      divisionId: division2.id,
      subDivisionId: subs2[0].id,
    },
    {
      windowId,
      userId: frank,
      divisionId: division2.id,
      subDivisionId: subs2[1].id,
    },
    {
      windowId,
      userId: gina,
      divisionId: division2.id,
      subDivisionId: subs2[1].id,
    },
  ]);
  // Dave and Frank each win their group's only match. In their own group both
  // are rank 1; merged, Dave's 2:0 outranks Frank's 2:1.
  const groupMatches = await db
    .insert(matches)
    .values([
      {
        subDivisionId: subs2[0].id,
        round: 1,
        playerAId: dave,
        playerBId: erin,
      },
      {
        subDivisionId: subs2[1].id,
        round: 1,
        playerAId: frank,
        playerBId: gina,
      },
    ])
    .returning({ id: matches.id, subDivisionId: matches.subDivisionId });
  const daveMatch = groupMatches.find(
    (m) => m.subDivisionId === subs2[0].id,
  ) as { id: string };
  const frankMatch = groupMatches.find(
    (m) => m.subDivisionId === subs2[1].id,
  ) as { id: string };
  await db.insert(matchResults).values([
    {
      matchId: daveMatch.id,
      outcome: "normal",
      winnerId: dave,
      platform: "cartridge",
      reportedById: dave,
      confirmedAt: new Date(),
    },
    {
      matchId: frankMatch.id,
      outcome: "normal",
      winnerId: frank,
      platform: "cartridge",
      reportedById: frank,
      confirmedAt: new Date(),
    },
  ]);
  await db.insert(matchGames).values([
    { matchId: daveMatch.id, gameNumber: 1, winnerId: dave },
    { matchId: daveMatch.id, gameNumber: 2, winnerId: dave },
    { matchId: frankMatch.id, gameNumber: 1, winnerId: frank },
    { matchId: frankMatch.id, gameNumber: 2, winnerId: gina },
    { matchId: frankMatch.id, gameNumber: 3, winnerId: frank },
  ]);
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  for (const id of [alice, bob, carol, dave, erin, frank, gina, staff]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("matchSelectionContext", () => {
  it("resolves a match's window, round, participants, and bye state", async () => {
    expect(await matchSelectionContext(matchR2)).toEqual({
      windowId,
      round: 2,
      playerAId: alice,
      playerBId: bob,
      isBye: false,
    });
    expect((await matchSelectionContext(matchBye))?.isBye).toBe(true);
  });
  it("returns null for an unknown id", async () => {
    expect(await matchSelectionContext(randomUUID())).toBeNull();
  });
});

describe("upsertMotw + motwForWindow", () => {
  it("stores one pick per round", async () => {
    await upsertMotw({ windowId, round: 1, matchId: matchR1, staffId: staff });
    await upsertMotw({ windowId, round: 2, matchId: matchR2, staffId: staff });
    expect(await motwForWindow(windowId)).toEqual([
      { round: 1, matchId: matchR1, youtubeUrl: null },
      { round: 2, matchId: matchR2, youtubeUrl: null },
    ]);
  });

  it("replacing a round's pick clears the YouTube URL", async () => {
    await setMotwYoutubeUrl({
      windowId,
      round: 1,
      url: "https://youtu.be/old",
    });
    // Same round, different match (the bye row works as a stand-in here; the
    // action layer is what forbids byes).
    await upsertMotw({ windowId, round: 1, matchId: matchBye, staffId: staff });
    const [roundOne] = await motwForWindow(windowId);
    expect(roundOne).toEqual({ round: 1, matchId: matchBye, youtubeUrl: null });
    // Restore round 1 for the following tests.
    await upsertMotw({ windowId, round: 1, matchId: matchR1, staffId: staff });
  });

  it("enforces one pick per round at the DB level", async () => {
    await expect(
      db
        .insert(motwSelections)
        .values({ windowId, round: 1, matchId: matchBye, selectedById: staff }),
    ).rejects.toThrow();
  });
});

describe("setMotwYoutubeUrl", () => {
  it("sets and clears the link, returning the match id", async () => {
    expect(
      await setMotwYoutubeUrl({
        windowId,
        round: 2,
        url: "https://www.youtube.com/watch?v=abc",
      }),
    ).toBe(matchR2);
    expect(await motwByMatchId(matchR2)).toEqual({
      round: 2,
      youtubeUrl: "https://www.youtube.com/watch?v=abc",
    });
    expect(await setMotwYoutubeUrl({ windowId, round: 2, url: null })).toBe(
      matchR2,
    );
    expect((await motwByMatchId(matchR2))?.youtubeUrl).toBeNull();
  });

  it("returns null for a round without a pick", async () => {
    expect(
      await setMotwYoutubeUrl({ windowId, round: 9, url: null }),
    ).toBeNull();
  });
});

describe("deleteMotw", () => {
  it("clears a pick and reports the match id", async () => {
    expect(await deleteMotw(windowId, 2)).toBe(matchR2);
    expect(await motwByMatchId(matchR2)).toBeNull();
    expect(await deleteMotw(windowId, 2)).toBeNull();
  });
});

describe("windowPlayerForm", () => {
  it("reports placement and record from the group table in sub_division mode", async () => {
    const form = await windowPlayerForm(windowId);
    expect(form.get(alice)).toEqual({
      rank: 1,
      wins: 1,
      losses: 0,
      dropped: false,
    });
    expect(form.get(bob)).toEqual({
      rank: 3,
      wins: 0,
      losses: 1,
      dropped: false,
    });
    // Carol only had a bye: level with nobody on wins, but ahead of Bob on
    // game differential.
    expect(form.get(carol)?.rank).toBe(2);
  });

  it("ranks from the merged Gesamttabelle in division mode", async () => {
    const form = await windowPlayerForm(windowId);
    // Both won their group's only match, so both are rank 1 in their own
    // group — the merged table splits them on game differential.
    expect(form.get(dave)?.rank).toBe(1);
    expect(form.get(frank)?.rank).toBe(2);
    expect(form.get(erin)?.rank).toBe(4);
    expect(form.get(gina)?.rank).toBe(3);
  });

  it("has no entry for a user outside the season", async () => {
    const form = await windowPlayerForm(windowId);
    expect(form.get(staff)).toBeUndefined();
  });
});

describe("profileFlags", () => {
  it("reports the capture card and whether the profile was ever saved", async () => {
    const flags = await profileFlags();
    expect(flags.get(alice)).toEqual({ hasCaptureCard: true, edited: true });
    // Bob and Carol both read `hasCaptureCard: false`; only `edited` separates
    // "answered no" from "never answered".
    expect(flags.get(bob)).toEqual({ hasCaptureCard: false, edited: true });
    expect(flags.get(carol)).toEqual({ hasCaptureCard: false, edited: false });
  });
});
