import { afterAll, describe, expect, it } from "vitest";
import { hasRelegationPlayoffsSchedule } from "@/features/schedule/queries";
import { publishBlockers } from "@/features/schedule/relegation-playoffs-publish";
import {
  publishFacts,
  relegationPlayoffsState,
} from "@/features/schedule/relegation-playoffs-setup";
import { validatePostSeason } from "@/features/seeding/post-season";
import { divisionsWithGroupSizes } from "@/features/seeding/queries";
import { latestWindow } from "@/features/staff/queries";
import { germanToday } from "@/lib/german-time";
import {
  clearSeedData,
  DEV_SEASON_SHAPE,
  generateAfterSeasonSeed,
  generateLateRegularSeasonSeed,
  generateSeedData,
} from "./seed";

// The seeded seasons must balance their movement: guaranteed promotion and
// demotion, and the Relegation at every boundary
// (docs/plans/relegation-and-playoffs.md), so "Spielplan für Relegation und
// Playoffs erstellen" works on a local season. Only those rules are checked:
// the running season seeds an accepted replacement, whose replaced player
// still counts in `divisionsWithGroupSizes`, so a group can read one larger
// than it plays.
const BALANCE = new Set(["balance", "relegation_unbalanced"]);
const balanceIssues = (issues: { kind: string }[]) =>
  issues.filter((issue) => BALANCE.has(issue.kind));

afterAll(async () => {
  await clearSeedData();
});

describe("dev seed post-season config", () => {
  it("is valid for the default running season shape", async () => {
    const { windowId } = await generateSeedData(0, {
      schedule: true,
      shape: DEV_SEASON_SHAPE,
    });
    const divisions = await divisionsWithGroupSizes(windowId);
    expect(balanceIssues(validatePostSeason(divisions))).toEqual([]);
  });

  it("is valid for a plain two-division season", async () => {
    const { windowId } = await generateSeedData(47, {
      schedule: true,
      size: 8,
      divisionCount: 2,
    });
    const divisions = await divisionsWithGroupSizes(windowId);
    expect(balanceIssues(validatePostSeason(divisions))).toEqual([]);
  });
});

describe("dev seed after the last Spieltag", () => {
  it("is ready to publish Relegation und Playoffs", async () => {
    await generateAfterSeasonSeed();
    const window = await latestWindow();
    expect(window).not.toBeNull();
    const windowId = window?.id ?? "";
    expect(await hasRelegationPlayoffsSchedule(windowId)).toBe(true);
    const blockers = publishBlockers(
      await publishFacts(windowId, germanToday()),
    );
    expect(blockers).toEqual([]);
    // Without planned ties nothing is shared at a boundary.
    const state = await relegationPlayoffsState(windowId);
    if (state.kind === "created") {
      expect(state.counts.tiebreakers).toBe(0);
      expect(state.staffOrders).toEqual([]);
    }
  });
});

describe("dev seed with shared places at zone boundaries", () => {
  it("has two tiebreakers and one staff order", async () => {
    await generateAfterSeasonSeed(undefined, { ties: true });
    const window = await latestWindow();
    const state = await relegationPlayoffsState(window?.id ?? "");
    expect(state.kind).toBe("created");
    if (state.kind === "created") {
      expect(state.counts.tiebreakers).toBe(2);
      expect(state.staffOrders.map((tie) => tie.players.length)).toEqual([3]);
    }
  });
});

describe("dev seed in the second-to-last Spieltag", () => {
  it("offers to create the schedule and has open points", async () => {
    await generateLateRegularSeasonSeed();
    const window = await latestWindow();
    const windowId = window?.id ?? "";
    expect(await hasRelegationPlayoffsSchedule(windowId)).toBe(false);
    const state = await relegationPlayoffsState(windowId);
    expect(state.kind === "setup" && state.setup !== null).toBe(true);
    const blockers = publishBlockers(
      await publishFacts(windowId, germanToday()),
    );
    expect(blockers.length).toBeGreaterThan(0);
  });
});
