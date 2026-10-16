import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTER,
  DEFAULT_OPTIONS,
  filterSheets,
  isFiltered,
  parseStatsParams,
  postSeasonBegun,
  selectionLabel,
  statsHref,
  type Week,
  weekOptions,
} from "./filter";
import { counted, team } from "./fixtures";

const ots = team({ species: "Incineroar" });
const a = counted(ots, { phase: "regular", tier: 1, round: 1 });
const b = counted(ots, { phase: "regular", tier: 2, round: 2 });
const c = counted(ots, { phase: "post", tier: 1, round: 8 });
const noTier = counted(ots, { phase: "regular", tier: null, round: 1 });
const all = [a, b, c, noTier];

const regular = (round: number, startsOn: string): Week => ({
  round,
  startsOn,
  endsOn: startsOn,
  regular: true,
});
const post = (round: number, startsOn: string): Week => ({
  round,
  startsOn,
  endsOn: startsOn,
  regular: false,
});
const weeks: Week[] = [
  regular(1, "2026-09-01"),
  regular(2, "2026-09-08"),
  regular(7, "2026-10-13"),
  post(8, "2026-10-20"),
  post(9, "2026-10-27"),
];

describe("filterSheets", () => {
  it("keeps everything by default", () => {
    expect(filterSheets(all, DEFAULT_FILTER)).toEqual(all);
  });
  it("narrows by phase, division and week, combined", () => {
    expect(filterSheets(all, { ...DEFAULT_FILTER, phase: "post" })).toEqual([
      c,
    ]);
    expect(filterSheets(all, { ...DEFAULT_FILTER, phase: "regular" })).toEqual([
      a,
      b,
      noTier,
    ]);
    expect(filterSheets(all, { ...DEFAULT_FILTER, tier: 1 })).toEqual([a, c]);
    expect(filterSheets(all, { ...DEFAULT_FILTER, round: 1 })).toEqual([
      a,
      noTier,
    ]);
    expect(filterSheets(all, { phase: "regular", tier: 1, round: 1 })).toEqual([
      a,
    ]);
    expect(filterSheets(all, { phase: "post", tier: 2, round: null })).toEqual(
      [],
    );
  });
  it("counts a sheet without a division only without a division filter", () => {
    expect(filterSheets([noTier], DEFAULT_FILTER)).toEqual([noTier]);
    expect(filterSheets([noTier], { ...DEFAULT_FILTER, tier: 1 })).toEqual([]);
  });
});

describe("postSeasonBegun", () => {
  it("starts with the first Nachsaison week", () => {
    expect(postSeasonBegun(weeks, "2026-10-19")).toBe(false);
    expect(postSeasonBegun(weeks, "2026-10-20")).toBe(true);
    expect(
      postSeasonBegun(
        weeks.filter((w) => w.regular),
        "2027-01-01",
      ),
    ).toBe(false);
  });
});

describe("weekOptions", () => {
  it("offers only started weeks with the hub's names", () => {
    expect(weekOptions(weeks, "2026-09-08", "all", new Set())).toEqual([
      { round: 1, name: "Spieltag 1" },
      { round: 2, name: "Spieltag 2" },
    ]);
  });
  it("splits the weeks by phase; the first Nachsaison week joins the regular season only with a tiebreaker", () => {
    const today = "2026-10-30";
    expect(
      weekOptions(weeks, today, "all", new Set()).map((o) => o.name),
    ).toEqual(["Spieltag 1", "Spieltag 2", "Spieltag 7", "Woche 1", "Woche 2"]);
    expect(
      weekOptions(weeks, today, "post", new Set()).map((o) => o.name),
    ).toEqual(["Woche 1", "Woche 2"]);
    expect(
      weekOptions(weeks, today, "regular", new Set()).map((o) => o.name),
    ).toEqual(["Spieltag 1", "Spieltag 2", "Spieltag 7"]);
    expect(
      weekOptions(weeks, today, "regular", new Set([8])).map((o) => o.name),
    ).toEqual(["Spieltag 1", "Spieltag 2", "Spieltag 7", "Woche 1"]);
  });
});

describe("selectionLabel", () => {
  const options = weekOptions(weeks, "2026-10-30", "all", new Set());
  it("spans the covered weeks", () => {
    expect(selectionLabel(DEFAULT_FILTER, options)).toBe(
      "Spieltag 1 bis 7 · Woche 1 bis 2",
    );
    expect(selectionLabel(DEFAULT_FILTER, options.slice(0, 1))).toBe(
      "Spieltag 1",
    );
    expect(selectionLabel(DEFAULT_FILTER, [])).toBe("");
  });
  it("names the filters", () => {
    expect(
      selectionLabel({ phase: "post", tier: 2, round: null }, options.slice(3)),
    ).toBe("Nachsaison · Division 2 · Woche 1 bis 2");
    expect(selectionLabel({ phase: "all", tier: 3, round: 2 }, options)).toBe(
      "Division 3 · Spieltag 2",
    );
  });
});

describe("parseStatsParams", () => {
  const before = {
    weeks,
    today: "2026-10-01",
    tiebreakerRounds: new Set<number>(),
  };
  const after = {
    weeks,
    today: "2026-10-30",
    tiebreakerRounds: new Set<number>(),
  };

  it("gives the defaults for no parameters", () => {
    expect(parseStatsParams({}, before)).toEqual({
      filter: DEFAULT_FILTER,
      options: DEFAULT_OPTIONS,
    });
  });
  it("reads every parameter", () => {
    expect(
      parseStatsParams(
        {
          phase: "post",
          division: "2",
          woche: "9",
          sort: "win-asc",
          min: "5",
          mega: "mega",
          protect: "0",
          steine: "1",
          alle: "1",
        },
        after,
      ),
    ).toEqual({
      filter: { phase: "post", tier: 2, round: 9 },
      options: {
        sort: { key: "win", dir: "asc" },
        minShare: 5,
        mega: "mega",
        hideProtect: true,
        hideOwnStones: false,
        all: true,
      },
    });
  });
  it("falls back to the default for invalid values", () => {
    expect(
      parseStatsParams(
        {
          phase: "x",
          division: "-1",
          woche: "abc",
          sort: "foo",
          min: "3",
          mega: "x",
          protect: "1",
          steine: "0",
          alle: "yes",
        },
        after,
      ),
    ).toEqual({ filter: DEFAULT_FILTER, options: DEFAULT_OPTIONS });
  });
  it("takes the first of repeated values", () => {
    expect(parseStatsParams({ division: ["3", "4"] }, before).filter.tier).toBe(
      3,
    );
  });
  it("ignores the phase before the Nachsaison and drops weeks the phase does not offer", () => {
    expect(parseStatsParams({ phase: "post" }, before).filter.phase).toBe(
      "all",
    );
    expect(
      parseStatsParams({ phase: "post", woche: "2" }, after).filter,
    ).toEqual({ phase: "post", tier: null, round: null });
    expect(parseStatsParams({ woche: "9" }, before).filter.round).toBeNull();
    expect(parseStatsParams({ woche: "2" }, before).filter.round).toBe(2);
  });
});

describe("statsHref", () => {
  it("omits defaults", () => {
    expect(
      statsHref("/statistiken/pokemon", DEFAULT_FILTER, DEFAULT_OPTIONS),
    ).toBe("/statistiken/pokemon");
  });
  it("carries filters and options", () => {
    expect(
      statsHref("/statistiken/items", { phase: "regular", tier: 2, round: 5 }),
    ).toBe("/statistiken/items?phase=regular&division=2&woche=5");
    expect(
      statsHref("/statistiken/attacken", DEFAULT_FILTER, {
        ...DEFAULT_OPTIONS,
        sort: { key: "win", dir: "desc" },
        minShare: 2,
        hideProtect: true,
        hideOwnStones: false,
        mega: "base",
        all: true,
      }),
    ).toBe(
      "/statistiken/attacken?sort=win-desc&min=2&mega=base&protect=0&steine=1&alle=1",
    );
  });
});

describe("isFiltered", () => {
  it("is false only for the defaults", () => {
    expect(isFiltered(DEFAULT_FILTER, DEFAULT_OPTIONS)).toBe(false);
    expect(isFiltered({ ...DEFAULT_FILTER, tier: 1 })).toBe(true);
    expect(
      isFiltered(DEFAULT_FILTER, { ...DEFAULT_OPTIONS, hideOwnStones: false }),
    ).toBe(true);
    expect(
      isFiltered(DEFAULT_FILTER, { ...DEFAULT_OPTIONS, minShare: 1 }),
    ).toBe(true);
  });
});
