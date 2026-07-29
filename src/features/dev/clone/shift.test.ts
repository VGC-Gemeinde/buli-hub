import { describe, expect, it } from "vitest";
import {
  buildShiftSql,
  parseShiftInterval,
  type TimestampColumn,
} from "./shift";

describe("parseShiftInterval", () => {
  it("accepts a single term", () => {
    expect(parseShiftInterval("30 days")).toBe("30 days");
    expect(parseShiftInterval("-2 weeks")).toBe("-2 weeks");
    expect(parseShiftInterval("1 month")).toBe("1 month");
  });

  it("accepts compound terms and normalises whitespace", () => {
    expect(parseShiftInterval("  -45 days   6 hours ")).toBe(
      "-45 days 6 hours",
    );
  });

  it("rejects unknown units", () => {
    expect(() => parseShiftInterval("30 fortnights")).toThrow(/Invalid shift/);
  });

  it("rejects a dangling term", () => {
    expect(() => parseShiftInterval("30")).toThrow(/Invalid shift/);
    expect(() => parseShiftInterval("30 days 6")).toThrow(/Invalid shift/);
  });

  it("rejects non-integer amounts", () => {
    expect(() => parseShiftInterval("1.5 days")).toThrow(/Invalid shift/);
  });

  // The parsed value is interpolated into SQL, so the grammar is the guard.
  it("rejects attempts to break out of the interval literal", () => {
    expect(() =>
      parseShiftInterval("1 days'; drop table profiles; --"),
    ).toThrow(/Invalid shift/);
    expect(() => parseShiftInterval("")).toThrow(/Invalid shift/);
  });
});

describe("buildShiftSql", () => {
  const columns: TimestampColumn[] = [
    { table: "matches", column: "created_at", kind: "timestamp" },
    { table: "matchdays", column: "starts_on", kind: "date" },
    { table: "matchdays", column: "ends_on", kind: "date" },
    { table: "matchdays", column: "created_at", kind: "timestamp" },
  ];

  it("emits one statement per table with every column assigned", () => {
    const sql = buildShiftSql(columns, "30 days");

    expect(sql).toHaveLength(2);
    expect(sql[0]).toBe(
      `update "public"."matchdays" set "created_at" = "created_at" + interval '30 days', "ends_on" = ("ends_on" + interval '30 days')::date, "starts_on" = ("starts_on" + interval '30 days')::date;`,
    );
    expect(sql[1]).toBe(
      `update "public"."matches" set "created_at" = "created_at" + interval '30 days';`,
    );
  });

  it("casts date columns back to date and leaves timestamps alone", () => {
    const [matchdays] = buildShiftSql(columns, "-1 week");

    expect(matchdays).toContain(`("starts_on" + interval '-1 week')::date`);
    expect(matchdays).toContain(`"created_at" = "created_at" + interval`);
    expect(matchdays).not.toContain(
      `("created_at" + interval '-1 week')::date`,
    );
  });

  it("applies the same interval everywhere", () => {
    const sql = buildShiftSql(columns, "-2 weeks 3 hours");

    for (const statement of sql) {
      const intervals = [...statement.matchAll(/interval '([^']*)'/g)].map(
        (match) => match[1],
      );
      expect(intervals.length).toBeGreaterThan(0);
      expect(new Set(intervals)).toEqual(new Set(["-2 weeks 3 hours"]));
    }
  });

  it("is deterministic regardless of input order", () => {
    const reversed = [...columns].reverse();

    expect(buildShiftSql(reversed, "30 days")).toEqual(
      buildShiftSql(columns, "30 days"),
    );
  });

  it("validates the interval before touching the columns", () => {
    expect(() => buildShiftSql(columns, "yesterday")).toThrow(/Invalid shift/);
  });

  it("refuses identifiers that could break the quoting", () => {
    const hostile: TimestampColumn[] = [
      { table: 'matches" set "x', column: "created_at", kind: "timestamp" },
    ];

    expect(() => buildShiftSql(hostile, "30 days")).toThrow(
      /Refusing to quote/,
    );
  });

  it("returns nothing for no columns", () => {
    expect(buildShiftSql([], "30 days")).toEqual([]);
  });
});
