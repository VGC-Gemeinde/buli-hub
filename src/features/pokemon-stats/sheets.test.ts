import { describe, expect, it } from "vitest";
import { exportMon, team } from "./fixtures";
import { megaLabel, toSlots } from "./sheets";

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
