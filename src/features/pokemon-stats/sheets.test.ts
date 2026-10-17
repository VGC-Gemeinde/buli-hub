import { describe, expect, it } from "vitest";
import { exportMon, team } from "./fixtures";
import { groupedEntryId, megaLabel, toSlots } from "./sheets";

const slot = (ots: string, index = 0) => {
  const slots = toSlots(ots);
  if (!slots) {
    throw new Error("does not parse");
  }
  return slots[index];
};

describe("toSlots", () => {
  it("turns a stored sheet into six slots", () => {
    const slots = toSlots(
      team({
        species: "Incineroar",
        item: "Sitrus Berry",
        ability: "Intimidate",
        nature: "Careful",
        moves: ["Fake Out", "Parting Shot"],
      }),
    );
    expect(slots).toHaveLength(6);
    expect(slots?.[0]).toEqual({
      entryId: "incineroar",
      name: "Incineroar",
      mega: null,
      sprite: "Incineroar",
      writtenSpecies: "Incineroar",
      item: "Sitrus Berry",
      ownStone: false,
      sheetAbility: "Intimidate",
      ability: "Intimidate",
      nature: "Careful",
      moves: ["Fake Out", "Parting Shot"],
    });
  });

  it("makes a Pokémon holding its own stone its Mega, named by the base, counting the Mega ability", () => {
    const mon = slot(
      team({
        species: "Charizard",
        item: "Charizardite Y",
        ability: "Blaze",
        moves: ["Heat Wave"],
      }),
    );
    expect(mon).toMatchObject({
      entryId: "charizardmegay",
      name: "Charizard",
      mega: "Mega Y",
      ownStone: true,
      sheetAbility: "Blaze",
      ability: "Drought",
    });
    expect(
      slot(team({ species: "Charizard", item: "Charizardite X" })),
    ).toMatchObject({ entryId: "charizardmegax", mega: "Mega X" });
    expect(slot(team({ species: "Gengar", item: "Gengarite" }))).toMatchObject({
      entryId: "gengarmega",
      mega: "Mega",
      name: "Gengar",
    });
  });

  it("counts both ways of writing a Mega alike", () => {
    const base = slot(
      team({ species: "Charizard", item: "Charizardite Y", ability: "Blaze" }),
    );
    const inline = slot(
      team({
        species: "Charizard-Mega-Y",
        item: "Charizardite Y",
        ability: "Blaze",
      }),
    );
    expect(inline).toEqual(base);
  });

  it("names a Mega Z and uses the Reg M-C ability override", () => {
    expect(
      slot(
        team({
          species: "Garchomp",
          item: "Garchompite Z",
          ability: "Rough Skin",
        }),
      ),
    ).toMatchObject({
      entryId: "garchompmegaz",
      mega: "Mega Z",
      ability: "Levitate",
    });
  });

  it("keeps a stone on a foreign Pokémon a plain item", () => {
    expect(
      slot(
        team({
          species: "Incineroar",
          item: "Charizardite X",
          ability: "Intimidate",
        }),
      ),
    ).toMatchObject({
      entryId: "incineroar",
      mega: null,
      item: "Charizardite X",
      ownStone: false,
      ability: "Intimidate",
    });
  });

  it("reads no item as null", () => {
    expect(
      slot(team({ species: "Ursaluna", ability: "Guts" })).item,
    ).toBeNull();
  });

  it("keeps regional formes as entries of their own", () => {
    expect(
      slot(
        team({
          species: "Ninetales-Alola",
          item: "Light Clay",
          ability: "Snow Warning",
        }),
      ).entryId,
    ).toBe("ninetalesalola");
  });

  it("counts a listed forme as its base and keeps the forme as written (spec 002)", () => {
    expect(
      slot(team({ species: "Sinistcha-Masterpiece", ability: "Hospitality" })),
    ).toMatchObject({
      entryId: "sinistcha",
      name: "Sinistcha",
      sprite: "Sinistcha",
      mega: null,
      writtenSpecies: "Sinistcha-Masterpiece",
    });
    expect(slot(team({ species: "Vivillon-Ocean" }))).toMatchObject({
      entryId: "vivillon",
      name: "Vivillon",
      writtenSpecies: "Vivillon-Ocean",
    });
  });

  it("counts a battle-only forme as the Pokémon it changes from (spec 002)", () => {
    expect(slot(team({ species: "Palafin-Hero" }))).toMatchObject({
      entryId: "palafin",
      name: "Palafin",
      sprite: "Palafin",
      writtenSpecies: "Palafin-Hero",
    });
  });

  it("keeps formes that play differently as entries of their own (spec 002, FR-003)", () => {
    for (const [species, id] of [
      ["Indeedee-F", "indeedeef"],
      ["Rotom-Wash", "rotomwash"],
      ["Basculegion-F", "basculegionf"],
      ["Gourgeist-Super", "gourgeistsuper"],
    ]) {
      expect(slot(team({ species })).entryId).toBe(id);
    }
  });

  it("never groups a Mega (spec 002, FR-005)", () => {
    expect(
      slot(team({ species: "Meowstic-F", item: "Meowsticite" })),
    ).toMatchObject({
      entryId: "meowsticfmega",
      name: "Meowstic-F",
      mega: "Mega",
      writtenSpecies: "Meowstic-F-Mega",
    });
    expect(
      slot(team({ species: "Floette-Eternal", item: "Floettite" })),
    ).toMatchObject({ entryId: "floettemega", writtenSpecies: "Floette-Mega" });
    expect(
      slot(team({ species: "Charizard", item: "Charizardite Y" })),
    ).toMatchObject({
      entryId: "charizardmegay",
      writtenSpecies: "Charizard-Mega-Y",
    });
  });

  it("merges spellings through the dex and passes unknown names through", () => {
    const mon = slot(
      team({
        species: "Fakemon",
        item: "sitrus berry",
        ability: "intimidate",
        moves: ["fake out", "Unknown Move"],
      }),
    );
    expect(mon).toMatchObject({
      entryId: "fakemon",
      name: "Fakemon",
      item: "Sitrus Berry",
      ability: "Intimidate",
      moves: ["Fake Out", "Unknown Move"],
    });
  });

  it("returns null for a text that is not a sheet", () => {
    expect(toSlots("not a team")).toBeNull();
    expect(toSlots(exportMon({ species: "Incineroar" }))).toBeNull();
  });
});

describe("megaLabel", () => {
  it("labels Mega formes and nothing else", () => {
    expect(megaLabel("Charizard-Mega-Y")).toBe("Mega Y");
    expect(megaLabel("Floette-Mega")).toBe("Mega");
    expect(megaLabel("Meowstic-F-Mega")).toBe("Mega");
    expect(megaLabel("Rotom-Wash")).toBeNull();
    expect(megaLabel("Fakemon")).toBeNull();
  });
});

describe("groupedEntryId", () => {
  it("finds the entry a former forme id counts under (spec 002, FR-008)", () => {
    expect(groupedEntryId("sinistchamasterpiece")).toBe("sinistcha");
    expect(groupedEntryId("vivillonocean")).toBe("vivillon");
    expect(groupedEntryId("palafinhero")).toBe("palafin");
  });

  it("leaves Megas, separate formes, entries and unknown ids alone", () => {
    for (const id of [
      "charizardmegay",
      "meowsticfmega",
      "rotomwash",
      "indeedeef",
      "sinistcha",
      "fakemon",
    ]) {
      expect(groupedEntryId(id)).toBe(id);
    }
  });
});
