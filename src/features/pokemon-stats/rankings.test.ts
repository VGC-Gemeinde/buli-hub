import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTER,
  DEFAULT_OPTIONS,
  filterSheets,
  type RankingOptions,
} from "./filter";
import { counted, team } from "./fixtures";
import { type RankingEntry, ranking, sortEntries } from "./rankings";

const opts = (over: Partial<RankingOptions> = {}): RankingOptions => ({
  ...DEFAULT_OPTIONS,
  ...over,
});

const zard = {
  species: "Charizard",
  item: "Charizardite Y",
  ability: "Blaze",
  moves: ["Heat Wave", "Protect"],
};
const zardSpecs = {
  species: "Charizard",
  item: "Choice Specs",
  ability: "Solar Power",
  moves: ["Heat Wave"],
};
const incin = {
  species: "Incineroar",
  item: "Sitrus Berry",
  ability: "Intimidate",
  moves: ["Fake Out", "Parting Shot"],
};
const incinStone = {
  species: "Incineroar",
  item: "Charizardite X",
  ability: "Intimidate",
  moves: ["Fake Out"],
};
const torkoal = {
  species: "Torkoal",
  item: "Charcoal",
  ability: "Drought",
  moves: ["Eruption", "Protect"],
};

const sheets = [
  counted(team(zard, incin), { result: "won" }),
  counted(team(zard, incin), { result: "lost" }),
  counted(team(zardSpecs, torkoal), { result: "won", tier: 2 }),
  counted(team(incinStone), { result: null }),
];

const byId = (entries: RankingEntry[]) =>
  Object.fromEntries(entries.map((e) => [e.id, e]));

describe("pokemonRanking", () => {
  const result = ranking(sheets, "pokemon", opts());

  it("counts sheets containing an entry over all sheets", () => {
    expect(result.sheets).toBe(4);
    const e = byId(result.entries);
    expect(e.incineroar).toMatchObject({ count: 3, share: 0.75 });
    expect(e.charizardmegay).toMatchObject({
      count: 2,
      share: 0.5,
      name: "Charizard",
      mega: "Mega Y",
    });
    expect(e.charizard).toMatchObject({ count: 1, mega: null });
  });

  it("sums to six per sheet (600 %)", () => {
    expect(result.entries.reduce((sum, e) => sum + e.count, 0)).toBe(24);
  });

  it("shares a rank on equal counts, alphabetically, the same every time", () => {
    const ties = result.entries.filter((e) => e.count === 4);
    expect(ties.map((e) => e.rank)).toEqual(ties.map(() => ties[0].rank));
    expect(ties.map((e) => e.name)).toEqual(
      [...ties.map((e) => e.name)].sort(),
    );
    expect(ranking(sheets, "pokemon", opts())).toEqual(result);
  });

  it("is empty without sheets", () => {
    expect(ranking([], "pokemon", opts())).toEqual({
      sheets: 0,
      slots: 0,
      entries: [],
    });
  });

  it("follows the filtered sheets", () => {
    const tierTwo = ranking(
      filterSheets(sheets, { ...DEFAULT_FILTER, tier: 2 }),
      "pokemon",
      opts(),
    );
    expect(tierTwo.sheets).toBe(1);
    expect(byId(tierTwo.entries).torkoal).toMatchObject({
      count: 1,
      share: 1,
      rank: 1,
    });
  });
});

describe("win rates", () => {
  it("counts wins over rated appearances; an unrated match counts for usage only", () => {
    const e = byId(ranking(sheets, "pokemon", opts()).entries);
    expect(e.incineroar).toMatchObject({ count: 3, wins: 1, rated: 2 });
    expect(e.charizard).toMatchObject({ wins: 1, rated: 1 });
  });

  it("counts a mirror on both sides", () => {
    const mirror = [
      counted(team(incin), { matchId: "x", result: "won" }),
      counted(team(incin), { matchId: "x", result: "lost" }),
    ];
    expect(
      byId(ranking(mirror, "pokemon", opts()).entries).incineroar,
    ).toMatchObject({ wins: 1, rated: 2 });
  });

  it("counts every carrier of a move", () => {
    const e = byId(ranking(sheets, "moves", opts()).entries);
    // Two Protect users on each of the first three sheets.
    expect(e.protect.count).toBeGreaterThanOrEqual(6);
    expect(e.fakeout).toMatchObject({ count: 3, wins: 1, rated: 2 });
  });
});

describe("itemRanking", () => {
  it("takes own stones out by default and keeps a stone on a foreign Pokémon", () => {
    const result = ranking(sheets, "items", opts());
    const e = byId(result.entries);
    expect(e.charizarditey).toBeUndefined();
    expect(e.charizarditex).toMatchObject({
      count: 1,
      share: 1 / 24,
      name: "Charizardite X",
      rated: 0,
    });
    expect(result.slots).toBe(24);
  });

  it("counts every stone with the filter off, summing to all slots", () => {
    const result = ranking(sheets, "items", opts({ hideOwnStones: false }));
    const e = byId(result.entries);
    expect(e.charizarditey).toMatchObject({ count: 2, wins: 1, rated: 2 });
    expect(result.entries.reduce((sum, x) => sum + x.count, 0)).toBe(24);
  });

  it("ranks over the counts shown", () => {
    const on = byId(ranking(sheets, "items", opts()).entries);
    const off = byId(
      ranking(sheets, "items", opts({ hideOwnStones: false })).entries,
    );
    expect(on.sitrusberry.rank).toBeLessThanOrEqual(off.sitrusberry.rank);
  });

  it("has one entry for Pokémon without an item", () => {
    const noItem = [counted(team({ species: "Ursaluna", ability: "Guts" }))];
    expect(byId(ranking(noItem, "items", opts()).entries).none).toMatchObject({
      name: "Kein Item",
      count: 1,
      item: null,
    });
  });
});

describe("abilityRanking", () => {
  it("counts a Mega with its Mega ability", () => {
    const e = byId(ranking(sheets, "abilities", opts()).entries);
    expect(e.drought.count).toBe(3); // two Mega Charizard Y and one Torkoal
    expect(e.blaze).toBeUndefined();
    expect(e.solarpower.count).toBe(1);
    expect(
      ranking(sheets, "abilities", opts()).entries.reduce(
        (s, x) => s + x.count,
        0,
      ),
    ).toBe(24);
  });
});

describe("moveRanking", () => {
  it("lets a slot carry up to four moves and can hide Protect", () => {
    const shown = ranking(sheets, "moves", opts({ hideProtect: true }));
    expect(byId(shown.entries).protect).toBeUndefined();
    expect(shown.slots).toBe(24);
    const total = ranking(sheets, "moves", opts()).entries.reduce(
      (s, x) => s + x.count,
      0,
    );
    expect(total).toBeLessThanOrEqual(4 * 24);
  });
});

describe("entry filters", () => {
  it("hides entries below the minimum share without changing shares or ranks", () => {
    const all = byId(ranking(sheets, "pokemon", opts()).entries);
    const min = ranking(
      sheets,
      "pokemon",
      opts({ minShare: 50 as RankingOptions["minShare"] }),
    ).entries;
    expect(min.every((e) => e.share >= 0.5)).toBe(true);
    for (const e of min) {
      expect(e).toEqual(all[e.id]);
    }
  });

  it("filters Megas and non-Megas", () => {
    const megas = ranking(sheets, "pokemon", opts({ mega: "mega" })).entries;
    expect(megas.map((e) => e.id)).toEqual(["charizardmegay"]);
    const base = ranking(sheets, "pokemon", opts({ mega: "base" })).entries;
    expect(base.some((e) => e.mega !== null)).toBe(false);
  });
});

describe("sortEntries", () => {
  const entry = (
    id: string,
    count: number,
    wins: number,
    rated: number,
  ): RankingEntry => ({
    id,
    name: id,
    mega: null,
    sprite: null,
    item: null,
    count,
    share: count / 10,
    rank: 0,
    wins,
    rated,
  });
  const list = [
    entry("b", 5, 3, 5),
    entry("a", 5, 1, 2),
    entry("c", 2, 1, 1),
    entry("d", 9, 0, 0),
  ];
  const ids = (sort: RankingOptions["sort"]) =>
    sortEntries(list, sort).map((e) => e.id);

  it("sorts by usage, ties by name", () => {
    expect(ids({ key: "use", dir: "desc" })).toEqual(["d", "a", "b", "c"]);
    expect(ids({ key: "use", dir: "asc" })).toEqual(["c", "a", "b", "d"]);
  });
  it("sorts by name", () => {
    expect(ids({ key: "name", dir: "asc" })).toEqual(["a", "b", "c", "d"]);
    expect(ids({ key: "name", dir: "desc" })).toEqual(["d", "c", "b", "a"]);
  });
  it("sorts by win rate, ties by matches, unrated last in both directions", () => {
    expect(ids({ key: "win", dir: "desc" })).toEqual(["c", "b", "a", "d"]);
    expect(ids({ key: "win", dir: "asc" })).toEqual(["a", "b", "c", "d"]);
  });
  it("sorts by match count", () => {
    expect(ids({ key: "matches", dir: "desc" })).toEqual(["b", "a", "c", "d"]);
  });
  it("keeps the usage rank", () => {
    const ranked = ranking(
      sheets,
      "pokemon",
      opts({ sort: { key: "name", dir: "asc" } }),
    );
    const byUse = byId(ranking(sheets, "pokemon", opts()).entries);
    for (const e of ranked.entries) {
      expect(e.rank).toBe(byUse[e.id].rank);
    }
  });
});
