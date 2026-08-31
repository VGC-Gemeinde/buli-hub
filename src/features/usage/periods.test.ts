import { describe, expect, it } from "vitest";
import {
  dayId,
  hourId,
  monthId,
  periodIdFor,
  recentPeriodIds,
  weekId,
  weekIdOfDay,
} from "./periods";

const at = (iso: string) => new Date(iso);

describe("period ids are on German time", () => {
  it("puts a late UTC evening on the next Berlin day in summer and winter", () => {
    expect(dayId(at("2026-07-15T22:30:00Z"))).toBe("2026-07-16");
    expect(hourId(at("2026-07-15T22:30:00Z"))).toBe("00");
    expect(dayId(at("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
    expect(dayId(at("2026-01-15T22:30:00Z"))).toBe("2026-01-15");
    expect(hourId(at("2026-01-15T22:30:00Z"))).toBe("23");
  });

  it("follows the DST change, where 02:00 does not exist", () => {
    // 2026-03-29: clocks jump from 02:00 CET to 03:00 CEST.
    expect(hourId(at("2026-03-29T00:30:00Z"))).toBe("01");
    expect(hourId(at("2026-03-29T01:30:00Z"))).toBe("03");
    expect(dayId(at("2026-03-29T01:30:00Z"))).toBe("2026-03-29");
  });

  it("pads the hour", () => {
    expect(hourId(at("2026-07-15T07:05:00Z"))).toBe("09");
  });

  it("sorts chronologically within a kind", () => {
    expect(
      dayId(at("2026-08-31T12:00:00Z")) > dayId(at("2026-08-30T12:00:00Z")),
    ).toBe(true);
    expect(monthId(at("2026-08-31T12:00:00Z"))).toBe("2026-08");
    expect(periodIdFor("month", at("2026-12-31T23:30:00Z"))).toBe("2027-01");
  });
});

describe("ISO weeks", () => {
  it("run Monday to Sunday and belong to the year of their Thursday", () => {
    expect(weekIdOfDay("2026-01-01")).toBe("2026-W01"); // a Thursday
    expect(weekIdOfDay("2026-12-31")).toBe("2026-W53"); // also a Thursday
    expect(weekIdOfDay("2027-01-03")).toBe("2026-W53"); // the Sunday after
    expect(weekIdOfDay("2027-01-04")).toBe("2027-W01"); // the Monday
    expect(weekIdOfDay("2021-01-03")).toBe("2020-W53");
    expect(weekIdOfDay("2026-08-31")).toBe("2026-W36");
  });

  it("use the Berlin day, not the UTC one", () => {
    // Sunday 23:30 UTC in summer is already Monday 01:30 in Berlin.
    expect(weekId(at("2026-08-30T23:30:00Z"))).toBe("2026-W36");
    expect(weekId(at("2026-08-30T21:30:00Z"))).toBe("2026-W35");
  });
});

describe("recentPeriodIds", () => {
  it("names the last N periods, oldest first, including the current one", () => {
    expect(recentPeriodIds("day", 3, at("2026-03-01T12:00:00Z"))).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ]);
    expect(recentPeriodIds("month", 3, at("2026-01-15T12:00:00Z"))).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
    expect(recentPeriodIds("week", 2, at("2027-01-04T12:00:00Z"))).toEqual([
      "2026-W53",
      "2027-W01",
    ]);
  });

  it("neither skips nor repeats a day across the DST change", () => {
    expect(recentPeriodIds("day", 3, at("2026-03-30T12:00:00Z"))).toEqual([
      "2026-03-28",
      "2026-03-29",
      "2026-03-30",
    ]);
    expect(recentPeriodIds("day", 3, at("2026-10-26T12:00:00Z"))).toEqual([
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
    ]);
  });

  it("starts from the Berlin day, not the UTC one", () => {
    expect(recentPeriodIds("day", 1, at("2026-07-15T22:30:00Z"))).toEqual([
      "2026-07-16",
    ]);
  });

  it("is continuous for the page's window sizes", () => {
    const days = recentPeriodIds("day", 30, at("2026-08-31T12:00:00Z"));
    expect(days).toHaveLength(30);
    expect(new Set(days).size).toBe(30);
    expect(days[0]).toBe("2026-08-02");
    const weeks = recentPeriodIds("week", 12, at("2026-08-31T12:00:00Z"));
    expect(new Set(weeks).size).toBe(12);
    expect(weeks.at(-1)).toBe("2026-W36");
  });
});
