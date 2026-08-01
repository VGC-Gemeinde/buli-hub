import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  divisions,
  matchdays,
  matches,
  placements,
  profiles,
  registrationWindows,
  subDivisions,
} from "@/db/schema";
import { LOCKED_ERROR } from "@/features/regelwerk/acceptance";
import { db } from "@/lib/db";

// The lock is only worth anything if the actions actually call it. The guard's
// own behaviour is covered in guard.integration.test.ts; what this file proves
// is the wiring — and that the lock runs *before* the action does any work, so
// a locked player cannot reach validation, the match, or the database.

const { currentUserMock, currentSeasonMock } = vi.hoisted(() => ({
  currentUserMock: vi.fn(),
  currentSeasonMock: vi.fn(),
}));
vi.mock("@/features/roles/guard", () => ({ currentUser: currentUserMock }));
vi.mock("@/features/season/season-status", () => ({
  currentSeason: currentSeasonMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/discord-posts/sync", () => ({
  syncResultPost: vi.fn(),
}));

const { reportMatch } = await import("@/features/reporting/actions");
const { openDispute } = await import("@/features/reporting/dispute-actions");
const { recordAcceptance, clearAcceptance } = await import("./queries");

const alice = randomUUID();
const bob = randomUUID();
let windowId: string;
let matchId: string;

function signedInAsAlice() {
  currentUserMock.mockResolvedValue({
    userId: alice,
    discordId: "1",
    role: "player",
    displayName: "Alice",
    username: "alice",
    avatarUrl: null,
  });
}

beforeAll(async () => {
  for (const id of [alice, bob]) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }
  await db.insert(profiles).values([
    { userId: alice, displayName: "Alice" },
    { userId: bob, displayName: "Bob" },
  ]);

  const [window] = await db
    .insert(registrationWindows)
    .values({
      closesAt: new Date("2026-06-30T18:00:00Z"),
      openedBy: alice,
      seasonNumber: 9,
    })
    .returning({ id: registrationWindows.id });
  windowId = window.id;

  const [division] = await db
    .insert(divisions)
    .values({ windowId, tier: 1 })
    .returning({ id: divisions.id });
  const [subDivision] = await db
    .insert(subDivisions)
    .values({ divisionId: division.id, position: 0 })
    .returning({ id: subDivisions.id });
  await db.insert(placements).values(
    [alice, bob].map((userId) => ({
      windowId,
      userId,
      divisionId: division.id,
      subDivisionId: subDivision.id,
    })),
  );
  await db.insert(matchdays).values({
    windowId,
    round: 1,
    startsOn: "2026-07-01",
    endsOn: "2026-07-07",
  });
  const [match] = await db
    .insert(matches)
    .values({
      subDivisionId: subDivision.id,
      round: 1,
      playerAId: alice,
      playerBId: bob,
    })
    .returning({ id: matches.id });
  matchId = match.id;

  currentSeasonMock.mockResolvedValue({
    window: { id: windowId, seasonNumber: 9 },
    phase: "regular_season",
  });
  signedInAsAlice();
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  for (const id of [alice, bob]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("reportMatch", () => {
  it("refuses an unaccepted player", async () => {
    await clearAcceptance(windowId, alice);

    expect(await reportMatch({ matchId, report: {} })).toEqual({
      ok: false,
      error: LOCKED_ERROR,
    });
  });

  // Garbage input plus no acceptance: the lock must be what answers, proving
  // it runs before the action looks at anything the caller controls.
  it("locks before validating the payload", async () => {
    await clearAcceptance(windowId, alice);

    const result = await reportMatch({
      matchId: "not-a-uuid",
      report: { nonsense: true },
    });

    expect(result).toEqual({ ok: false, error: LOCKED_ERROR });
  });

  it("stops locking once the player accepts", async () => {
    await recordAcceptance(windowId, alice);

    const result = await reportMatch({ matchId, report: {} });

    // Still rejected — the payload is empty — but no longer by the lock.
    expect(result.ok).toBe(false);
    expect(result).not.toEqual({ ok: false, error: LOCKED_ERROR });
  });
});

describe("openDispute", () => {
  it("refuses an unaccepted player", async () => {
    await clearAcceptance(windowId, alice);

    expect(
      await openDispute({ matchId, reason: "Ergebnis stimmt nicht" }),
    ).toEqual({ ok: false, error: LOCKED_ERROR });
  });

  it("stops locking once the player accepts", async () => {
    await recordAcceptance(windowId, alice);

    const result = await openDispute({
      matchId,
      reason: "Ergebnis stimmt nicht",
    });

    expect(result).not.toEqual({ ok: false, error: LOCKED_ERROR });
  });
});
