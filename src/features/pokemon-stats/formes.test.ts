import { Dex } from "@pkmn/dex";
import { describe, expect, it } from "vitest";
import { countedSpecies, FORME_GROUPS } from "./formes";

describe("FORME_GROUPS", () => {
  it("lists only formes the dex knows, each under its own base", () => {
    for (const [base, formes] of Object.entries(FORME_GROUPS)) {
      expect(Dex.species.get(base).name).toBe(base);
      for (const forme of formes) {
        const sp = Dex.species.get(forme);
        expect(sp.exists, forme).toBe(true);
        expect(sp.name, forme).toBe(forme);
        expect(sp.baseSpecies, forme).toBe(base);
      }
    }
  });

  // A dex update that adds a pattern fails here, so it is listed (or not) by a
  // reviewed change instead of joining silently.
  it("holds every forme of the species grouped with all their variants", () => {
    for (const base of ["Vivillon", "Florges", "Furfrou", "Alcremie"]) {
      const sp = Dex.species.get(base);
      const dex = [...(sp.otherFormes ?? []), ...(sp.cosmeticFormes ?? [])]
        .filter((forme) => !forme.endsWith("-Gmax"))
        .sort();
      expect([...FORME_GROUPS[base]].sort()).toEqual(dex);
    }
  });
});

describe("countedSpecies", () => {
  it("counts every listed forme as its base", () => {
    for (const [base, formes] of Object.entries(FORME_GROUPS)) {
      expect(countedSpecies(base)).toBe(base);
      for (const forme of formes) {
        expect(countedSpecies(forme), forme).toBe(base);
      }
    }
  });

  it("keeps formes that play differently (FR-003)", () => {
    for (const species of [
      "Indeedee-F",
      "Basculegion-F",
      "Meowstic-F",
      "Lycanroc-Dusk",
      "Lycanroc-Midnight",
      "Rotom-Wash",
      "Rotom-Heat",
      "Arcanine-Hisui",
      "Ninetales-Alola",
      "Tauros-Paldea-Aqua",
      "Gourgeist-Super",
      "Floette-Eternal",
    ]) {
      expect(countedSpecies(species)).toBe(species);
    }
  });

  it("counts a battle-only forme as the Pokémon it changes from (FR-004)", () => {
    expect(countedSpecies("Palafin-Hero")).toBe("Palafin");
    expect(countedSpecies("Aegislash-Blade")).toBe("Aegislash");
    expect(countedSpecies("Castform-Sunny")).toBe("Castform");
    expect(countedSpecies("Castform-Rainy")).toBe("Castform");
    expect(countedSpecies("Castform-Snowy")).toBe("Castform");
    expect(countedSpecies("Mimikyu-Busted")).toBe("Mimikyu");
    expect(countedSpecies("Morpeko-Hangry")).toBe("Morpeko");
    expect(countedSpecies("Darmanitan-Galar-Zen")).toBe("Darmanitan-Galar");
  });

  it("writes known species as the dex does and passes unknown ones through", () => {
    expect(countedSpecies("vivillon-ocean")).toBe("Vivillon");
    expect(countedSpecies("Fakemon")).toBe("Fakemon");
  });
});
