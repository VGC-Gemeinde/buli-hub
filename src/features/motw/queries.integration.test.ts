import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  divisions,
  matchdays,
  matches,
  motwSelections,
  subDivisions,
} from "@/db/schema";
import { createWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import {
  deleteMotw,
  matchSelectionContext,
  motwByMatchId,
  motwForWindow,
  setMotwYoutubeUrl,
  upsertMotw,
} from "./queries";

const alice = randomUUID();
const bob = randomUUID();
const carol = randomUUID();
const staff = randomUUID();
let windowId: string;
let matchR1: string; // alice vs bob, round 1
let matchR2: string; // alice vs bob, round 2
let matchBye: string; // carol bye, round 1

beforeAll(async () => {
  for (const id of [alice, bob, carol, staff]) {
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
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  for (const id of [alice, bob, carol, staff]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("matchSelectionContext", () => {
  it("resolves a match's window, round, and bye state", async () => {
    expect(await matchSelectionContext(matchR2)).toEqual({
      windowId,
      round: 2,
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
