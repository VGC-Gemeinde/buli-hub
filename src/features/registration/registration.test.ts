import { describe, expect, it } from "vitest";
import {
  isReturningPlayer,
  newPlayerSchema,
  resolvePlayerStatus,
  shouldShowProfileHint,
  veteranHistorySchema,
} from "./registration";

describe("resolvePlayerStatus", () => {
  it("is returning with no extra questions when detected", () => {
    expect(
      resolvePlayerStatus({
        detectedReturning: true,
        participatedBefore: null,
      }),
    ).toEqual({ status: "returning", needsVeteranHistory: false });
  });

  it("detection wins even if the self-report says no", () => {
    // A detected veteran never sees the self-report, but guard the logic.
    expect(
      resolvePlayerStatus({
        detectedReturning: true,
        participatedBefore: false,
      }),
    ).toEqual({ status: "returning", needsVeteranHistory: false });
  });

  it("is a self-reported veteran when undetected and participated", () => {
    expect(
      resolvePlayerStatus({
        detectedReturning: false,
        participatedBefore: true,
      }),
    ).toEqual({ status: "returning", needsVeteranHistory: true });
  });

  it("is new when undetected and did not participate", () => {
    expect(
      resolvePlayerStatus({
        detectedReturning: false,
        participatedBefore: false,
      }),
    ).toEqual({ status: "new", needsVeteranHistory: false });
  });

  it("is incomplete when undetected and unanswered", () => {
    expect(
      resolvePlayerStatus({
        detectedReturning: false,
        participatedBefore: null,
      }),
    ).toBeNull();
  });
});

describe("isReturningPlayer", () => {
  it("is true with at least one prior registration", () => {
    expect(isReturningPlayer(1)).toBe(true);
    expect(isReturningPlayer(3)).toBe(true);
  });
  it("is false with none", () => {
    expect(isReturningPlayer(0)).toBe(false);
  });
});

describe("shouldShowProfileHint", () => {
  const t = new Date("2026-07-02T12:00:00Z");

  it("shows when there is no profile row yet", () => {
    expect(shouldShowProfileHint(null)).toBe(true);
  });

  it("shows when neither edited nor dismissed", () => {
    expect(
      shouldShowProfileHint({
        settingsEditedAt: null,
        registrationHintDismissedAt: null,
      }),
    ).toBe(true);
  });

  it("hides once the profile was edited", () => {
    expect(
      shouldShowProfileHint({
        settingsEditedAt: t,
        registrationHintDismissedAt: null,
      }),
    ).toBe(false);
  });

  it("hides once dismissed", () => {
    expect(
      shouldShowProfileHint({
        settingsEditedAt: null,
        registrationHintDismissedAt: t,
      }),
    ).toBe(false);
  });
});

describe("veteranHistorySchema", () => {
  const valid = {
    prevSeason: "Saison 3",
    prevName: "OldNick",
    prevDivision: "1",
    prevPlacement: "2",
  };

  it("accepts all four fields", () => {
    expect(veteranHistorySchema.safeParse(valid).success).toBe(true);
  });

  it("coerces division and placement to numbers", () => {
    const parsed = veteranHistorySchema.parse(valid);
    expect(parsed.prevDivision).toBe(1);
    expect(parsed.prevPlacement).toBe(2);
  });

  it("rejects a non-numeric or zero division", () => {
    expect(
      veteranHistorySchema.safeParse({ ...valid, prevDivision: "eins" })
        .success,
    ).toBe(false);
    expect(
      veteranHistorySchema.safeParse({ ...valid, prevDivision: "0" }).success,
    ).toBe(false);
  });

  it("rejects any missing field", () => {
    for (const key of Object.keys(valid)) {
      expect(
        veteranHistorySchema.safeParse({ ...valid, [key]: "  " }).success,
      ).toBe(false);
    }
  });
});

describe("newPlayerSchema", () => {
  it("accepts a rating in range with achievements", () => {
    const result = newPlayerSchema.parse({
      skillSelfRating: 5,
      greatestAchievements: "Top 8 Regional",
    });
    expect(result.skillSelfRating).toBe(5);
    expect(result.greatestAchievements).toBe("Top 8 Regional");
  });

  it("accepts the range bounds", () => {
    expect(
      newPlayerSchema.safeParse({
        skillSelfRating: 0,
        greatestAchievements: "",
      }).success,
    ).toBe(true);
    expect(
      newPlayerSchema.safeParse({
        skillSelfRating: 10,
        greatestAchievements: "",
      }).success,
    ).toBe(true);
  });

  it("normalizes empty achievements to null", () => {
    expect(
      newPlayerSchema.parse({ skillSelfRating: 3, greatestAchievements: "  " })
        .greatestAchievements,
    ).toBeNull();
  });

  it("rejects a rating out of range or non-integer", () => {
    expect(newPlayerSchema.safeParse({ skillSelfRating: 11 }).success).toBe(
      false,
    );
    expect(newPlayerSchema.safeParse({ skillSelfRating: -1 }).success).toBe(
      false,
    );
    expect(newPlayerSchema.safeParse({ skillSelfRating: 2.5 }).success).toBe(
      false,
    );
  });
});
