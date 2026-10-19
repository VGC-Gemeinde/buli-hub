import { describe, expect, it } from "vitest";
import { entryDetail, pokemonDetail } from "./details";
import { counted, team } from "./fixtures";

const zardY = {
  species: "Charizard",
  item: "Charizardite Y",
  ability: "Blaze",
  nature: "Modest",
  moves: ["Heat Wave", "Protect"],
};
const zardYSolar = { ...zardY, ability: "Solar Power", nature: "Timid" };
const zardX = {
  species: "Charizard",
  item: "Charizardite X",
  ability: "Blaze",
  moves: ["Flare Blitz"],
};
const zard = {
  species: "Charizard",
  item: "Choice Specs",
  ability: "Solar Power",
  moves: ["Heat Wave", "Overheat"],
};
const incin = {
  species: "Incineroar",
  item: "Sitrus Berry",
  ability: "Intimidate",
  nature: "Careful",
  moves: ["Fake Out", "Parting Shot"],
};
const incinGoggles = { ...incin, item: "Safety Goggles" };
const incinStone = { ...incin, item: "Charizardite X" };

const sheets = [
  counted(team(zardY, incin), { result: "won" }),
  counted(team(zardYSolar, incinGoggles), { result: "lost" }),
  counted(team(zard, incinStone), { result: "won" }),
  counted(team(zardX), { result: "lost" }),
];

describe("pokemonDetail", () => {
  it("gives usage and win rate of the entry", () => {
    expect(pokemonDetail(sheets, "incineroar")).toMatchObject({
      count: 3,
      share: 0.75,
      wins: 2,
      rated: 3,
      mega: null,
    });
  });

  it("distributes items, abilities and natures to 100 %", () => {
    const detail = pokemonDetail(sheets, "incineroar");
    expect(detail?.items.map((r) => [r.name, r.count])).toEqual([
      ["Charizardite X", 1],
      ["Safety Goggles", 1],
      ["Sitrus Berry", 1],
    ]);
    for (const list of [detail?.items, detail?.abilities, detail?.natures]) {
      expect(list?.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1);
    }
    expect(detail?.fixedItem).toBeNull();
    expect(detail?.megaAbility).toBeNull();
  });

  it("shows a Mega's stone fixed, its Mega ability and the sheet abilities", () => {
    const detail = pokemonDetail(sheets, "charizardmegay");
    expect(detail).toMatchObject({
      name: "Charizard",
      mega: "Mega Y",
      fixedItem: "Charizardite Y",
      items: [],
      megaAbility: "Drought",
    });
    expect(detail?.abilities.map((r) => [r.name, r.share])).toEqual([
      ["Blaze", 0.5],
      ["Solar Power", 0.5],
    ]);
  });

  it("gives move shares of the entry's appearances", () => {
    const detail = pokemonDetail(sheets, "charizardmegay");
    expect(detail?.moves.find((m) => m.id === "heatwave")).toMatchObject({
      count: 2,
      share: 1,
    });
  });

  it("lists teammates as entries, a Mega as its Mega", () => {
    const detail = pokemonDetail(sheets, "incineroar");
    const ids = detail?.teammates.map((t) => t.id) ?? [];
    expect(ids).toContain("charizardmegay");
    expect(ids).toContain("charizard");
    expect(
      detail?.teammates.find((t) => t.id === "charizardmegay"),
    ).toMatchObject({ count: 2, mega: "Mega Y", share: 2 / 3 });
    expect(ids).not.toContain("incineroar");
  });

  it("links base and Megas of the same species", () => {
    const detail = pokemonDetail(sheets, "charizard");
    expect(detail?.family.map((f) => [f.id, f.share])).toEqual([
      ["charizardmegay", 0.5],
      ["charizardmegax", 0.25],
    ]);
  });

  it("is null for an entry not in the sheets", () => {
    expect(pokemonDetail(sheets, "venusaurmega")).toBeNull();
    expect(pokemonDetail([], "incineroar")).toBeNull();
  });
});

describe("entryDetail", () => {
  it("lists every holder of a stone, own and foreign", () => {
    const detail = entryDetail(sheets, "items", "charizarditex");
    expect(detail).toMatchObject({
      name: "Charizardite X",
      item: "Charizardite X",
      count: 2,
      share: 2 / 24,
    });
    expect(detail?.carriers.map((c) => [c.id, c.share])).toEqual([
      ["charizardmegax", 0.5],
      ["incineroar", 0.5],
    ]);
  });

  it("has a detail for Pokémon without an item", () => {
    const noItem = [counted(team({ species: "Ursaluna", ability: "Guts" }))];
    expect(entryDetail(noItem, "items", "none")).toMatchObject({
      name: "Kein Item",
      item: null,
      count: 1,
    });
  });

  it("counts Mega abilities as the ranking does", () => {
    const detail = entryDetail(sheets, "abilities", "drought");
    expect(detail?.carriers.map((c) => c.id)).toEqual(["charizardmegay"]);
    expect(
      entryDetail(sheets, "abilities", "toughclaws")?.carriers.map((c) => c.id),
    ).toEqual(["charizardmegax"]);
    expect(entryDetail(sheets, "abilities", "blaze")).toBeNull();
  });

  it("gives carriers summing to 100 % and the share of teams with a carrier", () => {
    const detail = entryDetail(sheets, "moves", "heatwave");
    expect(detail?.carriers.reduce((s, c) => s + c.share, 0)).toBeCloseTo(1);
    expect(detail?.teamShare).toBe(0.75);
    expect(detail).toMatchObject({ name: "Heat Wave", wins: 2, rated: 3 });
  });

  it("is null for an entry not in the sheets", () => {
    expect(entryDetail(sheets, "moves", "coaching")).toBeNull();
  });
});

describe("grouped formes (spec 002)", () => {
  const vivillon = (species: string) =>
    counted(
      team({ species, item: "Focus Sash", moves: ["Hurricane", "Protect"] }),
    );
  const vivillons = [
    ...Array.from({ length: 6 }, () => vivillon("Vivillon")),
    vivillon("Vivillon-Ocean"),
    vivillon("Vivillon-Ocean"),
    vivillon("Vivillon-Elegant"),
    vivillon("Vivillon-High Plains"),
  ];

  it("breaks a grouped entry down by the formes as written", () => {
    const detail = pokemonDetail(vivillons, "vivillon");
    expect(detail).toMatchObject({ name: "Vivillon", sprite: "Vivillon" });
    expect(
      detail?.formes.map((f) => [f.name, f.count, f.share, f.sprite]),
    ).toEqual([
      ["Vivillon", 6, 0.6, "Vivillon"],
      ["Vivillon-Ocean", 2, 0.2, "Vivillon-Ocean"],
      ["Vivillon-Elegant", 1, 0.1, "Vivillon-Elegant"],
      ["Vivillon-High Plains", 1, 0.1, "Vivillon-High Plains"],
    ]);
  });

  it("shows one forme other than the base as a single row", () => {
    const ocean = vivillons.filter(
      (sheet) => sheet.mons[0].writtenSpecies === "Vivillon-Ocean",
    );
    expect(pokemonDetail(ocean, "vivillon")?.formes).toMatchObject([
      { name: "Vivillon-Ocean", count: 2, share: 1 },
    ]);
  });

  it("has no breakdown when every appearance wrote the base", () => {
    expect(pokemonDetail(vivillons.slice(0, 6), "vivillon")?.formes).toEqual(
      [],
    );
  });

  it("lists a battle-only forme beside its Pokémon", () => {
    const palafin = [
      counted(team({ species: "Palafin" })),
      counted(team({ species: "Palafin" })),
      counted(team({ species: "Palafin-Hero" })),
    ];
    expect(
      pokemonDetail(palafin, "palafin")?.formes.map((f) => [f.name, f.count]),
    ).toEqual([
      ["Palafin", 2],
      ["Palafin-Hero", 1],
    ]);
  });

  it("has no breakdown for ungrouped entries and Megas", () => {
    expect(pokemonDetail(sheets, "incineroar")?.formes).toEqual([]);
    expect(pokemonDetail(sheets, "charizardmegay")?.formes).toEqual([]);
  });

  it("merges grouped teammates and carriers", () => {
    const mixed = [
      counted(
        team(incin, {
          species: "Polteageist-Antique",
          moves: ["Shell Smash"],
        }),
      ),
      counted(team(incin, { species: "Polteageist", moves: ["Shell Smash"] })),
      counted(team({ species: "Florges-Blue", moves: ["Moonblast"] })),
      counted(team({ species: "Florges", moves: ["Moonblast"] })),
    ];
    expect(
      pokemonDetail(mixed, "incineroar")?.teammates.find(
        (t) => t.id === "polteageist",
      ),
    ).toMatchObject({ count: 2, share: 1 });
    const moonblast = entryDetail(mixed, "moves", "moonblast");
    expect(moonblast?.carriers.find((c) => c.id === "florges")).toMatchObject({
      count: 2,
    });
    expect(moonblast?.carriers.some((c) => c.id === "florgesblue")).toBe(false);
    expect(
      entryDetail(mixed, "items", "none")?.carriers.find(
        (c) => c.id === "polteageist",
      ),
    ).toMatchObject({ count: 2 });
  });
});
