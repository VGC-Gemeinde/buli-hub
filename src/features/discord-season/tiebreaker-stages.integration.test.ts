import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { registrationWindows } from "@/db/schema";
import { clearSeedData, generateAfterSeasonSeed } from "@/features/dev/seed";
import { latestWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import { listPlacedPlayers, listSeasonGroups } from "./queries";

afterAll(async () => {
  await clearSeedData();
});

// The dev seed with shared places: a tiebreaker at the Division 1a playoff
// boundary, one at the Division 2a relegation seat, and a three-way staff
// order in Division 3a (`DEV_TIES`).
describe("listPlacedPlayers with undecided tiebreakers", () => {
  it("gives the tiebreaker players their stage room once the regular season is closed", async () => {
    await generateAfterSeasonSeed(undefined, { ties: true });
    const windowId = (await latestWindow())?.id ?? "";
    const groups = await listSeasonGroups(windowId);
    const tierOf = (subDivisionId: string) =>
      groups.find((g) => g.subDivisionId === subDivisionId)?.tier;

    // Before closing: no stage room exists, so nobody gets one.
    const before = await listPlacedPlayers(windowId);
    expect(before.filter((p) => (p.stages ?? []).length > 0)).toEqual([]);

    await db
      .update(registrationWindows)
      .set({ regularSeasonClosedAt: new Date() })
      .where(eq(registrationWindows.id, windowId));

    // The seats are not written yet (no syncSeats), so every stage room here
    // comes from a tiebreaker: two players each, the staff order left out.
    const after = await listPlacedPlayers(windowId);
    const withRoom = after
      .filter((p) => (p.stages ?? []).length > 0)
      .map((p) => ({ tier: tierOf(p.subDivisionId), stages: p.stages }));
    expect(withRoom).toHaveLength(4);
    expect(withRoom.filter((p) => p.tier === 1)).toEqual([
      { tier: 1, stages: ["playoff"] },
      { tier: 1, stages: ["playoff"] },
    ]);
    expect(withRoom.filter((p) => p.tier === 2)).toEqual([
      { tier: 2, stages: ["relegation"] },
      { tier: 2, stages: ["relegation"] },
    ]);
  });
});
