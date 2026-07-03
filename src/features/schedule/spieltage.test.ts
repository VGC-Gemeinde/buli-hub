import { describe, expect, it } from "vitest";
import {
  defaultDeadlines,
  matchdayName,
  nextSundayAtLeast,
  shiftDeadlineFrom,
  spieltagCount,
  spieltagDeadlinesSchema,
  windowsFromDeadlines,
} from "./spieltage";

describe("matchdayName", () => {
  it("names the Spieltag", () => {
    expect(matchdayName(1)).toBe("Spieltag 1");
    expect(matchdayName(12)).toBe("Spieltag 12");
  });
});

describe("spieltagCount", () => {
  it("is 0 without groups", () => {
    expect(spieltagCount([])).toBe(0);
  });

  it("takes the largest group's round count", () => {
    // roundCount: 7→7, 6→5 → max 7; 8→7 → 7; single-player group → 0.
    expect(spieltagCount([7, 7, 6])).toBe(7);
    expect(spieltagCount([8, 8])).toBe(7);
    expect(spieltagCount([1])).toBe(0);
    expect(spieltagCount([4, 5])).toBe(5);
  });
});

describe("nextSundayAtLeast", () => {
  it("jumps past a Sunday that is closer than minDays", () => {
    // Wed 2026-07-01 + 7 = Wed 07-08 → next Sunday 07-12 (11 days out).
    expect(nextSundayAtLeast("2026-07-01", 7)).toBe("2026-07-12");
  });

  it("accepts a Sunday exactly minDays away", () => {
    // Sun 2026-07-05 + 7 = Sun 07-12 (exactly 7 days).
    expect(nextSundayAtLeast("2026-07-05", 7)).toBe("2026-07-12");
  });

  it("handles a Monday start", () => {
    // Mon 2026-07-13 + 7 = Mon 07-20 → next Sunday 07-26 (13 days out).
    expect(nextSundayAtLeast("2026-07-13", 7)).toBe("2026-07-26");
  });
});

describe("defaultDeadlines", () => {
  it("is empty for a non-positive count", () => {
    expect(defaultDeadlines("2026-07-01", 0)).toEqual([]);
  });

  it("starts at the first eligible Sunday, then every 7 days", () => {
    expect(defaultDeadlines("2026-07-01", 3)).toEqual([
      "2026-07-12",
      "2026-07-19",
      "2026-07-26",
    ]);
  });
});

describe("windowsFromDeadlines", () => {
  it("week 1 starts at the season start; later weeks the day after the prior deadline", () => {
    expect(
      windowsFromDeadlines("2026-07-01", [
        "2026-07-12",
        "2026-07-19",
        "2026-07-26",
      ]),
    ).toEqual([
      { start: "2026-07-01", end: "2026-07-12" },
      { start: "2026-07-13", end: "2026-07-19" },
      { start: "2026-07-20", end: "2026-07-26" },
    ]);
  });
});

describe("shiftDeadlineFrom", () => {
  const base = ["2026-07-12", "2026-07-19", "2026-07-26"];

  it("shifts a middle week and everything after it", () => {
    // Extend week 2 by a week (07-19 → 07-26); week 3 moves by the same delta.
    expect(shiftDeadlineFrom(base, 1, "2026-07-26")).toEqual([
      "2026-07-12",
      "2026-07-26",
      "2026-08-02",
    ]);
  });

  it("shifts the first week and everything after it", () => {
    expect(shiftDeadlineFrom(base, 0, "2026-07-19")).toEqual([
      "2026-07-19",
      "2026-07-26",
      "2026-08-02",
    ]);
  });

  it("leaves earlier weeks untouched", () => {
    expect(shiftDeadlineFrom(base, 2, "2026-08-09")).toEqual([
      "2026-07-12",
      "2026-07-19",
      "2026-08-09",
    ]);
  });
});

describe("spieltagDeadlinesSchema", () => {
  it("accepts a strictly ascending list", () => {
    expect(
      spieltagDeadlinesSchema.safeParse(["2026-07-12", "2026-07-19"]).success,
    ).toBe(true);
  });

  it("rejects an empty list", () => {
    expect(spieltagDeadlinesSchema.safeParse([]).success).toBe(false);
  });

  it("rejects a non-ascending list", () => {
    expect(
      spieltagDeadlinesSchema.safeParse(["2026-07-19", "2026-07-12"]).success,
    ).toBe(false);
    expect(
      spieltagDeadlinesSchema.safeParse(["2026-07-12", "2026-07-12"]).success,
    ).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(spieltagDeadlinesSchema.safeParse(["07/12/2026"]).success).toBe(
      false,
    );
  });
});
