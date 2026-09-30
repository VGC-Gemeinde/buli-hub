import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  divisions,
  matches,
  placements,
  profiles,
  regelwerkAcceptances,
  registrations,
  subDivisions,
} from "@/db/schema";
import { setDropped } from "@/features/drops/queries";
import { groupStandingsInput } from "@/features/reporting/queries";
import { computeStandings } from "@/features/reporting/standings";
import { createWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import {
  acceptedReplacementsForSubDivision,
  acceptedReplacementsForWindow,
  acceptOffer,
  createOffer,
  deletePendingOffer,
  offerContext,
  pendingOfferFor,
  replacementCandidates,
  replacementStateOf,
  replacementsForWindow,
} from "./queries";

// One group of four (a, b, c and x) in a three-round round-robin. x is
// dropped after round 1; r, who has signed in but never played, takes the
// slot from round 2 on. `stranger` has no profile: never signed in.
const a = randomUUID();
const b = randomUUID();
const c = randomUUID();
const x = randomUUID();
const r = randomUUID();
const stranger = randomUUID();
const staff = randomUUID();
const users = [a, b, c, x, r, stranger, staff];
let windowId: string;
let subDivisionId: string;
let divisionId: string;

const newRegistration = () => ({
  windowId,
  userId: r,
  platform: "showdown" as const,
  status: "new" as const,
  participatedBefore: false,
  veteran: null,
  newPlayer: { skillSelfRating: 3, greatestAchievements: "" },
});

beforeAll(async () => {
  for (const id of users) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }
  await db.insert(profiles).values([
    { userId: a, displayName: "Alpha" },
    { userId: b, displayName: "Bravo" },
    { userId: c, displayName: "Charlie" },
    { userId: x, displayName: "Xaver" },
    { userId: r, displayName: "Romeo" },
    { userId: staff, displayName: "Staffi", role: "staff" },
  ]);

  await createWindow(new Date("2026-06-30T18:00:00Z"), staff, 1);
  const rows = await db.execute<{ id: string }>(
    sql`select id from registration_windows where opened_by = ${staff}`,
  );
  windowId = rows[0].id;

  const [division] = await db
    .insert(divisions)
    .values({ windowId, tier: 1 })
    .returning({ id: divisions.id });
  divisionId = division.id;
  const [subDivision] = await db
    .insert(subDivisions)
    .values({ divisionId, position: 0 })
    .returning({ id: subDivisions.id });
  subDivisionId = subDivision.id;
  await db.insert(placements).values(
    [a, b, c, x].map((userId) => ({
      windowId,
      userId,
      divisionId,
      subDivisionId,
    })),
  );
  await db.insert(matches).values([
    { subDivisionId, round: 1, playerAId: x, playerBId: a },
    { subDivisionId, round: 1, playerAId: b, playerBId: c },
    { subDivisionId, round: 2, playerAId: b, playerBId: x },
    { subDivisionId, round: 2, playerAId: a, playerBId: c },
    { subDivisionId, round: 3, playerAId: x, playerBId: c },
    { subDivisionId, round: 3, playerAId: a, playerBId: b },
  ]);
  await setDropped({ windowId, userId: x, staffId: staff, reason: "Weg" });
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  for (const id of users) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

async function roundsOf(userId: string): Promise<number[]> {
  const rows = await db
    .select({ round: matches.round })
    .from(matches)
    .where(
      and(
        eq(matches.subDivisionId, subDivisionId),
        sql`${userId} in (${matches.playerAId}, ${matches.playerBId})`,
      ),
    );
  return rows.map((row) => row.round).sort();
}

describe("offer lifecycle", () => {
  it("offers signed-in, unplaced users only", async () => {
    const ids = (await replacementCandidates(windowId)).map((c) => c.userId);
    expect(ids).toContain(r);
    expect(ids).toContain(staff);
    for (const placed of [a, b, c, x]) {
      expect(ids).not.toContain(placed);
    }
    expect(ids).not.toContain(stranger);
  });

  it("reports what an offer has to check", async () => {
    expect(
      await offerContext({
        windowId,
        replacedUserId: x,
        candidateUserId: r,
      }),
    ).toEqual({
      replacedPlacement: {
        droppedAt: expect.any(Date),
        subDivisionId,
      },
      existing: "none",
      candidateExists: true,
      candidatePlaced: false,
      candidateHasOffer: false,
    });
    const strangerContext = await offerContext({
      windowId,
      replacedUserId: x,
      candidateUserId: stranger,
    });
    expect(strangerContext.candidateExists).toBe(false);
    const placedContext = await offerContext({
      windowId,
      replacedUserId: x,
      candidateUserId: a,
    });
    expect(placedContext.candidatePlaced).toBe(true);
  });

  it("creates, shows and withdraws an offer without touching anything", async () => {
    await createOffer({
      windowId,
      replacedUserId: x,
      replacementUserId: r,
      offeredById: staff,
      entryRound: 2,
    });
    expect(await replacementStateOf(windowId, x)).toBe("pending");
    const offer = await pendingOfferFor(windowId, r);
    expect(offer).toMatchObject({
      replaced: { userId: x, name: "Xaver" },
      subDivisionId,
      groupName: "Division 1a",
      entryRound: 2,
    });
    expect(await pendingOfferFor(windowId, a)).toBeNull();
    // Pending changes neither tables nor candidates' eligibility elsewhere.
    expect(await acceptedReplacementsForWindow(windowId)).toEqual([]);
    expect(
      (await replacementCandidates(windowId)).map((c) => c.userId),
    ).not.toContain(r);
    expect(
      (await offerContext({ windowId, replacedUserId: x, candidateUserId: r }))
        .existing,
    ).toBe("pending");

    expect(await deletePendingOffer(windowId, x)).toBe(true);
    expect(await deletePendingOffer(windowId, x)).toBe(false);
    expect(await replacementStateOf(windowId, x)).toBe("none");
  });

  it("refuses a second offer for the same slot", async () => {
    await createOffer({
      windowId,
      replacedUserId: x,
      replacementUserId: r,
      offeredById: staff,
      entryRound: 2,
    });
    await expect(
      createOffer({
        windowId,
        replacedUserId: x,
        replacementUserId: staff,
        offeredById: staff,
        entryRound: 2,
      }),
    ).rejects.toThrow();
    await deletePendingOffer(windowId, x);
  });
});

describe("acceptance", () => {
  it("does nothing without a pending offer", async () => {
    expect(
      await acceptOffer({ registration: newRegistration(), entryRound: 2 }),
    ).toBe(false);
    expect(await roundsOf(r)).toEqual([]);
  });

  it("moves the slot's matches from the entry round on, and nothing else", async () => {
    await createOffer({
      windowId,
      replacedUserId: x,
      replacementUserId: r,
      offeredById: staff,
      entryRound: 3,
    });
    // The matchday staff chose is over by now: the action hands in the
    // corrected round, and that is what gets stored.
    expect(
      await acceptOffer({ registration: newRegistration(), entryRound: 2 }),
    ).toBe(true);

    expect(await roundsOf(x)).toEqual([1]);
    expect(await roundsOf(r)).toEqual([2, 3]);
    // Both sides of a pairing move (x was player B in round 2, A in round 3).
    expect(await roundsOf(b)).toEqual([1, 2, 3]);

    const placement = await db.query.placements.findFirst({
      where: and(eq(placements.windowId, windowId), eq(placements.userId, r)),
    });
    expect(placement).toMatchObject({ divisionId, subDivisionId });
    expect(placement?.droppedAt).toBeNull();

    const registration = await db.query.registrations.findFirst({
      where: and(
        eq(registrations.windowId, windowId),
        eq(registrations.userId, r),
      ),
    });
    expect(registration).toMatchObject({
      platform: "showdown",
      status: "new",
      skillSelfRating: 3,
    });
    const acceptance = await db.query.regelwerkAcceptances.findFirst({
      where: and(
        eq(regelwerkAcceptances.windowId, windowId),
        eq(regelwerkAcceptances.userId, r),
      ),
    });
    expect(acceptance).toBeDefined();

    expect(await replacementStateOf(windowId, x)).toBe("accepted");
    expect(await acceptedReplacementsForWindow(windowId)).toEqual([
      { replacedUserId: x, replacementUserId: r, entryRound: 2 },
    ]);
    expect(await acceptedReplacementsForSubDivision(subDivisionId)).toEqual([
      { replacedUserId: x, replacementUserId: r, entryRound: 2 },
    ]);
    const [row] = await replacementsForWindow(windowId);
    expect(row.replaced.name).toBe("Xaver");
    expect(row.replacement.name).toBe("Romeo");
    expect(row.acceptedAt).not.toBeNull();

    // Accepted is final: no second acceptance, no withdrawal.
    expect(
      await acceptOffer({ registration: newRegistration(), entryRound: 2 }),
    ).toBe(false);
    expect(await deletePendingOffer(windowId, x)).toBe(false);
  });

  it("shows the slot as one row, carrying the earlier drop loss", async () => {
    const input = await groupStandingsInput(subDivisionId);
    expect(input.roster.map((m) => m.userId).sort()).toEqual(
      [a, b, c, r].sort(),
    );
    // Names still resolve for the round 1 match, which stays x's.
    expect(input.members.map((m) => m.userId)).toContain(x);

    const table = computeStandings({
      roster: input.roster,
      results: input.results,
    });
    // Round 1 (x vs a) is the drop's free win for a and r's loss; r's own
    // matches are open.
    expect(table.find((row) => row.userId === r)).toMatchObject({
      wins: 0,
      losses: 1,
      gamesLost: 2,
    });
    expect(table.find((row) => row.userId === a)).toMatchObject({
      wins: 1,
      losses: 0,
    });
    expect(table.find((row) => row.userId === x)).toBeUndefined();
  });
});
