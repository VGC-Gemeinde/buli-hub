import { describe, expect, it } from "vitest";
import { matchStageTitle, tieKeyGroup } from "./stage-title";

describe("matchStageTitle", () => {
  it("names each stage", () => {
    expect(
      matchStageTitle({ stage: "regular", tier: 1, groupPosition: 0 }),
    ).toBe("Division 1a");
    expect(
      matchStageTitle({ stage: "tiebreaker", tier: 2, groupPosition: 1 }),
    ).toBe("Tiebreaker · Division 2b");
    expect(
      matchStageTitle({ stage: "tiebreaker", tier: 4, groupPosition: null }),
    ).toBe("Tiebreaker · Division 4");
    expect(
      matchStageTitle({ stage: "relegation", tier: 2, groupPosition: null }),
    ).toBe("Relegation · Division 2 und 3");
    expect(
      matchStageTitle({
        stage: "playoff",
        tier: 1,
        groupPosition: null,
        playoffRound: 2,
        playoffRounds: 3,
      }),
    ).toBe("Playoffs · Halbfinale");
  });
});

describe("tieKeyGroup", () => {
  it("reads the group of a group tie and nothing of a division tie", () => {
    expect(tieKeyGroup("group:abc:3")).toBe("abc");
    expect(tieKeyGroup("division:4:7")).toBeNull();
  });
});
