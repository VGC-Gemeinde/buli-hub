import { and, desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { matches, motwSelections, profiles } from "@/db/schema";
import { db } from "@/lib/db";

// The billboard after the regular season (docs/plans/relegation-and-playoffs.md):
// a confirmed Match of the Week from the Playoffs is found outside the
// regular groups, and the final turns the billboard into its final variant.

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

const { clearSeedData, generateAfterSeasonSeed, reportDevResults } =
  await import("@/features/dev/seed");
const { publishRelegationPlayoffs } = await import(
  "@/features/schedule/actions"
);
const { latestWindow } = await import("@/features/staff/queries");
const { publicLeagueOverview } = await import("./queries");

let windowId: string;
let staffId: string;
let finalId: string;
let finalRound: number;
const guest = { userId: null, isStaff: false };

beforeAll(async () => {
  await generateAfterSeasonSeed();
  const window = await latestWindow();
  windowId = window?.id ?? "";
  const [staff] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.username, "orga"));
  staffId = staff.userId;
  currentUserMock.mockResolvedValue({ userId: staffId, role: "staff" });
  expect(await publishRelegationPlayoffs()).toEqual({ ok: true });
  // Every round after the regular season, one call per round.
  for (let round = 0; round < 3; round++) {
    await reportDevResults(1000);
  }
  const [final] = await db
    .select({ id: matches.id, round: matches.round })
    .from(matches)
    .where(and(eq(matches.windowId, windowId), eq(matches.stage, "playoff")))
    .orderBy(desc(matches.round))
    .limit(1);
  finalId = final.id;
  finalRound = final.round;
});

afterAll(async () => {
  await clearSeedData();
});

async function confirm(
  matchId: string,
  round: number,
  youtubeUrl: string | null,
) {
  await db.delete(motwSelections).where(eq(motwSelections.windowId, windowId));
  await db.insert(motwSelections).values({
    windowId,
    round,
    matchId,
    youtubeUrl,
    selectedById: staffId,
  });
}

describe("the billboard after the regular season", () => {
  it("features the final as the final variant, with its stage and week", async () => {
    await confirm(finalId, finalRound, "https://youtu.be/final");
    const overview = await publicLeagueOverview(
      windowId,
      9,
      "2099-01-01",
      guest,
    );
    expect(overview.motw).toMatchObject({
      final: true,
      weekName: "Woche 2",
      groupName: "Playoffs · Finale",
      youtubeUrl: "https://youtu.be/final",
      match: { matchId: finalId, reported: true, embargo: null },
    });
    expect(overview.motw?.match.winnerId).not.toBeNull();
  });

  it("withholds the final's result from the public until the VOD", async () => {
    await confirm(finalId, finalRound, null);
    const overview = await publicLeagueOverview(
      windowId,
      9,
      "2099-01-01",
      guest,
    );
    expect(overview.motw?.match).toMatchObject({
      reported: true,
      winnerId: null,
      scoreA: null,
      embargo: { reason: "motw", access: "withheld" },
    });
  });

  it("features a Relegation match as a plain billboard", async () => {
    const [relegation] = await db
      .select({ id: matches.id, round: matches.round })
      .from(matches)
      .where(
        and(eq(matches.windowId, windowId), eq(matches.stage, "relegation")),
      )
      .limit(1);
    await confirm(relegation.id, relegation.round, "https://youtu.be/r");
    const overview = await publicLeagueOverview(
      windowId,
      9,
      "2099-01-01",
      guest,
    );
    expect(overview.motw).toMatchObject({
      final: false,
      weekName: "Woche 1",
    });
    expect(overview.motw?.groupName).toMatch(
      /^Relegation · Division \d und \d$/,
    );
  });
});
