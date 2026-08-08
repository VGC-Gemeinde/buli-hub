import { describe, expect, it } from "vitest";
import {
  EMPTY_VETERAN_DRAFT,
  firstErrorField,
  isReturningPlayer,
  newPlayerSchema,
  resolvePlayerStatus,
  shouldShowProfileHint,
  validateRegistration,
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

describe("wholeNumberField messages (via veteranHistorySchema)", () => {
  const valid = {
    prevSeason: "Saison 3",
    prevName: "OldNick",
    prevDivision: "1",
    prevPlacement: "2",
  };

  function divisionMessage(prevDivision: string): string | undefined {
    const result = veteranHistorySchema.safeParse({ ...valid, prevDivision });
    return result.success
      ? undefined
      : result.error.issues.find((issue) => issue.path[0] === "prevDivision")
          ?.message;
  }

  // The reported bug: a player typed "3b" and the form said nothing at all.
  it("names the real problem for typed gibberish", () => {
    expect(divisionMessage("3b")).toBe(
      "Bitte nur Ziffern eingeben, zum Beispiel 3",
    );
  });

  it("distinguishes an empty field from a non-numeric one", () => {
    expect(divisionMessage("")).toBe("Pflichtfeld");
    expect(divisionMessage("   ")).toBe("Pflichtfeld");
  });

  // z.coerce.number() would read these as 0 and 100 and report a range error.
  it("rejects decimals, signs and exponents as non-numeric", () => {
    expect(divisionMessage("3.5")).toBe(
      "Bitte nur Ziffern eingeben, zum Beispiel 3",
    );
    expect(divisionMessage("-1")).toBe(
      "Bitte nur Ziffern eingeben, zum Beispiel 3",
    );
    expect(divisionMessage("1e2")).toBe(
      "Bitte nur Ziffern eingeben, zum Beispiel 3",
    );
  });

  it("reports range only for actual numbers", () => {
    expect(divisionMessage("0")).toBe("Mindestens 1");
    expect(divisionMessage("31")).toBe("Höchstens 30");
    expect(divisionMessage("30")).toBeUndefined();
  });

  it("uses each field's own upper bound", () => {
    expect(
      veteranHistorySchema.safeParse({ ...valid, prevPlacement: "500" })
        .success,
    ).toBe(true);
    const tooBig = veteranHistorySchema.safeParse({
      ...valid,
      prevPlacement: "501",
    });
    expect(tooBig.success).toBe(false);
  });

  it("tolerates surrounding whitespace and leading zeros", () => {
    const parsed = veteranHistorySchema.parse({
      ...valid,
      prevDivision: " 7 ",
      prevPlacement: "007",
    });
    expect(parsed.prevDivision).toBe(7);
    expect(parsed.prevPlacement).toBe(7);
  });
});

describe("validateRegistration", () => {
  const veteranAnswers = {
    prevSeason: "Saison 3",
    prevName: "OldNick",
    prevDivision: "2",
    prevPlacement: "5",
  };

  const base = {
    platform: "showdown",
    detectedReturning: false,
    participatedBefore: null as boolean | null,
    veteran: EMPTY_VETERAN_DRAFT,
    skillSelfRating: null as number | null,
    greatestAchievements: "",
    acceptedRules: true,
  };

  it("passes a detected returner who only picks a platform", () => {
    expect(validateRegistration({ ...base, detectedReturning: true })).toEqual(
      {},
    );
  });

  it("passes a self-reported veteran with a full history", () => {
    expect(
      validateRegistration({
        ...base,
        participatedBefore: true,
        veteran: veteranAnswers,
      }),
    ).toEqual({});
  });

  it("passes a new player who rated themselves", () => {
    expect(
      validateRegistration({
        ...base,
        participatedBefore: false,
        skillSelfRating: 4,
      }),
    ).toEqual({});
  });

  it("reports a missing platform", () => {
    expect(
      validateRegistration({ ...base, platform: "", detectedReturning: true })
        .platform,
    ).toBe("Bitte eine Plattform wählen");
  });

  it("reports an unanswered participation question", () => {
    expect(validateRegistration(base).participatedBefore).toBe(
      "Bitte wählen, ob du schon einmal teilgenommen hast",
    );
  });

  it("reports the missing Regelwerk acceptance", () => {
    expect(
      validateRegistration({
        ...base,
        detectedReturning: true,
        acceptedRules: false,
      }).acceptedRules,
    ).toBe("Bitte das Regelwerk akzeptieren, um dich anzumelden");
  });

  it("reports every empty veteran field at once", () => {
    expect(validateRegistration({ ...base, participatedBefore: true })).toEqual(
      {
        prevSeason: "Pflichtfeld",
        prevName: "Pflichtfeld",
        prevDivision: "Pflichtfeld",
        prevPlacement: "Pflichtfeld",
      },
    );
  });

  it("reports each veteran field in isolation", () => {
    for (const key of Object.keys(veteranAnswers)) {
      const errors = validateRegistration({
        ...base,
        participatedBefore: true,
        veteran: { ...veteranAnswers, [key]: "" },
      });
      expect(errors).toEqual({ [key]: "Pflichtfeld" });
    }
  });

  it("carries the typed-gibberish message through to the field", () => {
    expect(
      validateRegistration({
        ...base,
        participatedBefore: true,
        veteran: { ...veteranAnswers, prevDivision: "3b" },
      }),
    ).toEqual({ prevDivision: "Bitte nur Ziffern eingeben, zum Beispiel 3" });
  });

  it("prefers Pflichtfeld over the format message for an empty field", () => {
    // Zod reports both checks; the player only wants the first one.
    expect(
      validateRegistration({
        ...base,
        participatedBefore: true,
        veteran: { ...veteranAnswers, prevDivision: "" },
      }).prevDivision,
    ).toBe("Pflichtfeld");
  });

  it("ignores veteran fields for a new player", () => {
    expect(
      validateRegistration({
        ...base,
        participatedBefore: false,
        skillSelfRating: 0,
        veteran: { ...EMPTY_VETERAN_DRAFT, prevDivision: "3b" },
      }),
    ).toEqual({});
  });

  it("ignores the rating for a veteran", () => {
    expect(
      validateRegistration({
        ...base,
        participatedBefore: true,
        veteran: veteranAnswers,
        skillSelfRating: null,
      }),
    ).toEqual({});
  });

  it("ignores both branches for a detected returner", () => {
    expect(
      validateRegistration({
        ...base,
        detectedReturning: true,
        participatedBefore: null,
        veteran: { ...EMPTY_VETERAN_DRAFT, prevDivision: "3b" },
        skillSelfRating: null,
      }),
    ).toEqual({});
  });

  it("requires the new player to move the slider", () => {
    expect(
      validateRegistration({ ...base, participatedBefore: false })
        .skillSelfRating,
    ).toBe("Bitte deine Einschätzung abgeben");
  });

  it("accepts 0 as a deliberate rating", () => {
    // 0 ("blutiger Anfänger") is a real answer, distinct from "not answered".
    expect(
      validateRegistration({
        ...base,
        participatedBefore: false,
        skillSelfRating: 0,
      }),
    ).toEqual({});
  });

  it("reports achievements that are too long", () => {
    expect(
      validateRegistration({
        ...base,
        participatedBefore: false,
        skillSelfRating: 5,
        greatestAchievements: "x".repeat(2001),
      }).greatestAchievements,
    ).toBe("Höchstens 2000 Zeichen");
  });

  it("collects problems across branches in one pass", () => {
    expect(
      validateRegistration({
        ...base,
        platform: "",
        participatedBefore: true,
        veteran: { ...veteranAnswers, prevPlacement: "0" },
        acceptedRules: false,
      }),
    ).toEqual({
      platform: "Bitte eine Plattform wählen",
      prevPlacement: "Mindestens 1",
      acceptedRules: "Bitte das Regelwerk akzeptieren, um dich anzumelden",
    });
  });
});

describe("firstErrorField", () => {
  it("is null when there is nothing to fix", () => {
    expect(firstErrorField({})).toBeNull();
  });

  it("follows the order of the form, not the object", () => {
    expect(
      firstErrorField({
        acceptedRules: "x",
        prevPlacement: "x",
        platform: "x",
      }),
    ).toBe("platform");
    expect(firstErrorField({ prevPlacement: "x", prevSeason: "x" })).toBe(
      "prevSeason",
    );
  });

  it("skips fields that are absent", () => {
    expect(firstErrorField({ acceptedRules: "x" })).toBe("acceptedRules");
  });
});
