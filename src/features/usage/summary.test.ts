import { describe, expect, it } from "vitest";
import { recentPeriodIds } from "./periods";
import {
  buildSummary,
  emptyPeriodRow,
  hoursOfDay,
  type PeriodRow,
  periodLabel,
  series,
  summaryMetaLine,
} from "./summary";

const at = (iso: string) => new Date(iso);
const row = (id: string, visits = 0, uniques = 0, hours = {}): PeriodRow => ({
  id,
  visits,
  uniques,
  hours,
});

describe("series", () => {
  it("marks periods before counting began as uncounted, not as zero", () => {
    const rows = [
      row("2026-08-01"),
      row("2026-08-02"),
      row("2026-08-03", 5, 3),
    ];
    const out = series("day", rows, at("2026-08-02T10:00:00Z"));
    expect(out.map((p) => p.counted)).toEqual([false, true, true]);
  });

  it("treats a period holding visits as counted whatever the marker says", () => {
    const out = series(
      "day",
      [row("2026-07-20", 12, 4)],
      at("2026-08-02T10:00:00Z"),
    );
    expect(out[0]?.counted).toBe(true);
  });

  it("marks everything uncounted while nothing has been counted", () => {
    const out = series("week", [row("2026-W35"), row("2026-W36")], null);
    expect(out.every((p) => !p.counted)).toBe(true);
  });

  it("uses the Berlin period of the start instant", () => {
    // 22:30 UTC on the 1st is already the 2nd in Berlin: the 1st is unknown.
    const out = series(
      "day",
      [row("2026-08-01"), row("2026-08-02")],
      at("2026-08-01T22:30:00Z"),
    );
    expect(out.map((p) => p.counted)).toEqual([false, true]);
  });
});

describe("hoursOfDay", () => {
  it("returns 24 Berlin hours with the visits of today", () => {
    const today = row("2026-08-31", 3, 2, { "09": 2, "21": 1 });
    const hours = hoursOfDay(
      today,
      at("2026-08-01T00:00:00Z"),
      at("2026-08-31T12:00:00Z"),
    );
    expect(hours).toHaveLength(24);
    expect(hours[9]).toEqual({
      hour: "09",
      label: "09:00",
      visits: 2,
      counted: true,
    });
    expect(hours[21]?.visits).toBe(1);
    expect(hours.every((h) => h.counted)).toBe(true);
  });

  it("marks the hours before a same-day start as unknown", () => {
    // Counting began 14:20 Berlin time (12:20 UTC in summer).
    const hours = hoursOfDay(
      undefined,
      at("2026-08-31T12:20:00Z"),
      at("2026-08-31T16:00:00Z"),
    );
    expect(hours[13]?.counted).toBe(false);
    expect(hours[14]?.counted).toBe(true);
    expect(hours[23]?.counted).toBe(true);
  });

  it("marks every hour unknown before anything was counted", () => {
    const hours = hoursOfDay(undefined, null, at("2026-08-31T16:00:00Z"));
    expect(hours.every((h) => !h.counted)).toBe(true);
  });
});

describe("buildSummary", () => {
  it("picks today, this week and this month from the series", () => {
    const now = at("2026-08-31T12:00:00Z");
    const days = recentPeriodIds("day", 30, now).map((id) =>
      id === "2026-08-31" ? row(id, 10, 6, { "13": 10 }) : emptyPeriodRow(id),
    );
    const weeks = recentPeriodIds("week", 12, now).map((id) =>
      id === "2026-W36" ? row(id, 40, 20) : emptyPeriodRow(id),
    );
    const months = recentPeriodIds("month", 12, now).map((id) =>
      id === "2026-08" ? row(id, 900, 300) : emptyPeriodRow(id),
    );
    const summary = buildSummary({
      days,
      weeks,
      months,
      startedAt: at("2026-08-10T00:00:00Z"),
      now,
    });
    expect(summary.today).toEqual({ visits: 10, uniques: 6 });
    expect(summary.week).toEqual({ visits: 40, uniques: 20 });
    expect(summary.month).toEqual({ visits: 900, uniques: 300 });
    expect(summary.hours[13]?.visits).toBe(10);
    expect(summary.days.filter((d) => !d.counted)).toHaveLength(8); // 02.08. to 09.08.
    expect(summary.months.find((m) => m.id === "2026-07")?.counted).toBe(false);
  });

  it("reads as all zeros with everything unknown when nothing exists", () => {
    const now = at("2026-08-31T12:00:00Z");
    const summary = buildSummary({
      days: recentPeriodIds("day", 30, now).map(emptyPeriodRow),
      weeks: recentPeriodIds("week", 12, now).map(emptyPeriodRow),
      months: recentPeriodIds("month", 12, now).map(emptyPeriodRow),
      startedAt: null,
      now,
    });
    expect(summary.today).toEqual({ visits: 0, uniques: 0 });
    expect(summary.days.every((d) => !d.counted)).toBe(true);
    expect(summaryMetaLine(summary)).toMatch(
      /^Noch nichts gezählt · deutsche Zeit · Stand 31\.08\.2026, 14:00$/,
    );
  });
});

describe("labels", () => {
  it("are German and carry the year", () => {
    expect(periodLabel("day", "2026-08-31")).toContain("31.08.2026");
    expect(periodLabel("day", "2026-08-31")).toMatch(/^Mo/);
    expect(periodLabel("week", "2026-W06")).toBe("KW 6 · 2026");
    expect(periodLabel("month", "2026-08")).toBe("August 2026");
  });

  it("describe the collection window in German time", () => {
    const now = at("2026-08-31T12:03:00Z");
    const summary = buildSummary({
      days: [],
      weeks: [],
      months: [],
      startedAt: at("2026-07-31T22:30:00Z"),
      now,
    });
    expect(summaryMetaLine(summary)).toBe(
      "Gezählt seit 01.08.2026 · deutsche Zeit · Stand 31.08.2026, 14:03",
    );
  });
});
