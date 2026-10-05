import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  divisions,
  favorites,
  matchdays,
  matches,
  matchGames,
  matchResults,
  placements,
  profiles,
  subDivisions,
} from "@/db/schema";
import { createWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import {
  addFavorite,
  favoriteIds,
  favoritesPage,
  hubUserExists,
  removeFavorite,
} from "./queries";

const fan = randomUUID();
const alice = randomUUID();
const bob = randomUUID();
const carl = randomUUID();
const staff = randomUUID();
const users = [fan, alice, bob, carl, staff];
let windowId: string;
let heldMatchId: string;

// Round 2 is running.
const today = "2026-07-09";

async function win(matchId: string, winnerId: string) {
  await db.insert(matchResults).values({
    matchId,
    outcome: "normal",
    winnerId,
    platform: "cartridge",
    reportedById: winnerId,
    confirmedAt: new Date(),
  });
  await db.insert(matchGames).values([
    { matchId, gameNumber: 1, winnerId },
    { matchId, gameNumber: 2, winnerId },
  ]);
}

beforeAll(async () => {
  for (const id of users) {
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
  await db.insert(profiles).values([
    { userId: alice, displayName: "Alice", username: "alice.vgc" },
    { userId: bob, displayName: "Bob" },
    { userId: carl, displayName: "Carl" },
  ]);
  await db.insert(placements).values(
    [alice, bob, carl].map((userId) => ({
      windowId,
      userId,
      divisionId: division.id,
      subDivisionId: subDivision.id,
    })),
  );

  const [r1, r2] = await db
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
        playerBId: carl,
      },
    ])
    .returning({ id: matches.id });
  heldMatchId = r2.id;
  await win(r1.id, alice);
  await win(r2.id, alice);
  // Round 2 is held for a stream recording: not public yet.
  await db.execute(sql`
    insert into recording_holds (match_id, window_id, round, held_by_id)
    values (${heldMatchId}, ${windowId}, 2, ${staff})
  `);
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  for (const id of users) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("favourites storage", () => {
  it("adds once, however often it is asked", async () => {
    await addFavorite(fan, alice);
    await addFavorite(fan, alice);
    expect(await favoriteIds(fan)).toEqual(new Set([alice]));
    await removeFavorite(fan, alice);
    expect(await favoriteIds(fan)).toEqual(new Set());
  });

  it("has nothing for nobody signed in", async () => {
    expect(await favoriteIds(null)).toEqual(new Set());
  });

  it("refuses to favourite yourself", async () => {
    await expect(addFavorite(fan, fan)).rejects.toThrow();
  });

  it("goes with the account of either side", async () => {
    const gone = randomUUID();
    await db.execute(sql`insert into auth.users (id) values (${gone})`);
    await addFavorite(fan, gone);
    await db.execute(sql`delete from auth.users where id = ${gone}`);
    const left = await db
      .select()
      .from(favorites)
      .where(sql`${favorites.playerId} = ${gone}`);
    expect(left).toEqual([]);
  });

  it("knows which hub users exist", async () => {
    expect(await hubUserExists(alice)).toBe(true);
    expect(await hubUserExists(randomUUID())).toBe(false);
  });
});

describe("favoritesPage", () => {
  async function page() {
    return favoritesPage({
      windowId,
      seasonNumber: 1,
      today,
      viewer: { userId: fan, isStaff: false },
      favoriteIds: new Set([alice]),
    });
  }

  it("counts what the public table counts", async () => {
    const data = await page();
    expect(data.currentRound).toBe(2);
    const [row] = data.players;
    // The held round-2 win is not public, so neither the record nor the form
    // has it.
    expect(row).toMatchObject({ userId: alice, wins: 1, losses: 0, rank: 1 });
    expect(row.form.map((c) => c.result)).toEqual(["W"]);
  });

  it("lists every round of the favourite's matches", async () => {
    const data = await page();
    expect(data.groups).toHaveLength(1);
    const held = data.groups[0].matches.find((m) => m.matchId === heldMatchId);
    expect(held?.embargo).toEqual({ reason: "recording", access: "withheld" });
    expect(held?.scoreA).toBeNull();
    expect(data.groups[0].matches.map((m) => m.round)).toEqual([1, 2]);
  });

  it("offers the season's players with their handles, not the viewer", async () => {
    const data = await page();
    expect(data.candidates.map((p) => [p.name, p.username])).toEqual([
      ["Alice", "alice.vgc"],
      ["Bob", null],
      ["Carl", null],
    ]);
  });
});
