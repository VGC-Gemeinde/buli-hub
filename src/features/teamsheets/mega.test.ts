import { describe, expect, it } from "vitest";
import { canonicalSpecies, natureEffect, resolveMega } from "./mega";

// Champions brought megas back, and Delphox/Staraptor are Champions-era stones
// — they exist in @pkmn/dex 0.10.11, which is what these tests pin down.

describe("canonicalSpecies", () => {
  it("rewrites an inline mega forme to its base form", () => {
    expect(canonicalSpecies("Delphox-Mega", "Delphoxite")).toBe("Delphox");
    expect(canonicalSpecies("Staraptor-Mega", "Staraptite")).toBe("Staraptor");
  });

  it("leaves a base form holding its stone alone", () => {
    expect(canonicalSpecies("Delphox", "Delphoxite")).toBe("Delphox");
  });

  it("makes both paste services agree on the same team", () => {
    // Pokepaste writes the mega inline, VRPaste hands back the base form.
    expect(canonicalSpecies("Staraptor-Mega", "Staraptite")).toBe(
      canonicalSpecies("Staraptor", "Staraptite"),
    );
  });

  it("keeps a mega forme that is not holding its stone", () => {
    expect(canonicalSpecies("Delphox-Mega", "Life Orb")).toBe("Delphox-Mega");
    expect(canonicalSpecies("Delphox-Mega", null)).toBe("Delphox-Mega");
  });

  it("ignores a stone held by the wrong species", () => {
    expect(canonicalSpecies("Garchomp", "Delphoxite")).toBe("Garchomp");
  });

  it("normalises casing for species the dex knows", () => {
    expect(canonicalSpecies("garchomp", null)).toBe("Garchomp");
  });

  it("passes through a species the dex does not know, unmangled", () => {
    // Dex lowercases the name of anything it does not know; we must not.
    expect(canonicalSpecies("Fakemon-Mega", "Fakeite")).toBe("Fakemon-Mega");
  });

  // Stones the dex keys by a form other than the base species: the holding
  // form is what we store, and a form that cannot hold the stone stays as it
  // is.
  describe("stones keyed by a specific form", () => {
    it("keeps Floette-Eternal, the only Floette that can hold Floettite", () => {
      expect(canonicalSpecies("Floette-Eternal", "Floettite")).toBe(
        "Floette-Eternal",
      );
      expect(canonicalSpecies("Floette-Mega", "Floettite")).toBe(
        "Floette-Eternal",
      );
      // Plain Floette cannot mega-evolve; the stone is just an item to it.
      expect(canonicalSpecies("Floette", "Floettite")).toBe("Floette");
    });

    it("keeps the form for stones with one entry per form", () => {
      expect(canonicalSpecies("Tatsugiri-Droopy", "Tatsugirinite")).toBe(
        "Tatsugiri-Droopy",
      );
      expect(canonicalSpecies("Tatsugiri-Droopy-Mega", "Tatsugirinite")).toBe(
        "Tatsugiri-Droopy",
      );
      expect(canonicalSpecies("Meowstic-F-Mega", "Meowsticite")).toBe(
        "Meowstic-F",
      );
      expect(canonicalSpecies("Zygarde-Mega", "Zygardite")).toBe(
        "Zygarde-Complete",
      );
    });
  });
});

describe("resolveMega", () => {
  it("resolves a base form holding its stone", () => {
    expect(resolveMega("Delphox", "Delphoxite")).toEqual({
      spriteSpecies: "Delphox-Mega",
      displayName: "Delphox",
      megaAbility: "Levitate",
    });
  });

  it("resolves an inline mega forme and still displays the base name", () => {
    expect(resolveMega("Staraptor-Mega", "Staraptite")).toEqual({
      spriteSpecies: "Staraptor-Mega",
      displayName: "Staraptor",
      megaAbility: "Contrary",
    });
  });

  it("leaves a mon without a stone unresolved", () => {
    expect(resolveMega("Garchomp", "Life Orb")).toEqual({
      spriteSpecies: "Garchomp",
      displayName: "Garchomp",
      megaAbility: null,
    });
  });

  it("leaves a mon with no item unresolved", () => {
    expect(resolveMega("Garchomp", null).megaAbility).toBeNull();
  });

  it("resolves a stone keyed by a specific form", () => {
    expect(resolveMega("Floette-Eternal", "Floettite")).toEqual({
      spriteSpecies: "Floette-Mega",
      displayName: "Floette-Eternal",
      megaAbility: "Fairy Aura",
    });
    // The right mega for the form, not the first entry of the stone.
    expect(resolveMega("Tatsugiri-Droopy", "Tatsugirinite").spriteSpecies).toBe(
      "Tatsugiri-Droopy-Mega",
    );
    expect(resolveMega("Meowstic-F", "Meowsticite").spriteSpecies).toBe(
      "Meowstic-F-Mega",
    );
    expect(resolveMega("Zygarde-Complete", "Zygardite").spriteSpecies).toBe(
      "Zygarde-Mega",
    );
  });

  it("does not mega-evolve a form that cannot hold the stone", () => {
    expect(resolveMega("Floette", "Floettite")).toEqual({
      spriteSpecies: "Floette",
      displayName: "Floette",
      megaAbility: null,
    });
  });

  it("never throws on a species the dex does not know", () => {
    expect(resolveMega("Fakemon", "Fakeite")).toEqual({
      spriteSpecies: "Fakemon",
      displayName: "Fakemon",
      megaAbility: null,
    });
  });

  // Regulation Set M-C, 2026-09-08. @pkmn/dex 0.10.11 predates it and hands
  // back a placeholder ability for each of these, so the overrides carry the
  // real ones. When a dex release makes one of these pass without its
  // override, drop the override.
  it("names the M-C mega abilities the dex does not have yet", () => {
    const cases: [string, string, string][] = [
      ["Garchomp", "Garchompite Z", "Levitate"],
      ["Lucario", "Lucarionite Z", "Aura Guard"],
      ["Absol", "Absolite Z", "Sharpness"],
      ["Golisopod", "Golisopite", "Tough Claws"],
    ];
    for (const [species, stone, ability] of cases) {
      expect(resolveMega(species, stone).megaAbility).toBe(ability);
      // A paste that writes the mega inline must agree.
      const mega = resolveMega(species, stone).spriteSpecies;
      expect(resolveMega(mega, stone).megaAbility).toBe(ability);
    }
  });

  it("never crosses Meowstic's two base formes", () => {
    // One stone, two base formes, and the megas are named "Meowstic-M-Mega" /
    // "Meowstic-F-Mega" — so the forme is not the "Mega" prefix the other
    // megas use, and the male mega's holding form is plain "Meowstic". Each
    // of the four spellings has to land on its own side.
    const male = { spriteSpecies: "Meowstic-M-Mega", displayName: "Meowstic" };
    const female = {
      spriteSpecies: "Meowstic-F-Mega",
      displayName: "Meowstic-F",
    };
    for (const written of ["Meowstic", "Meowstic-M", "Meowstic-M-Mega"]) {
      const { spriteSpecies, displayName } = resolveMega(
        written,
        "Meowsticite",
      );
      expect({ spriteSpecies, displayName }).toEqual(male);
    }
    for (const written of ["Meowstic-F", "Meowstic-F-Mega"]) {
      const { spriteSpecies, displayName } = resolveMega(
        written,
        "Meowsticite",
      );
      expect({ spriteSpecies, displayName }).toEqual(female);
    }
    expect(canonicalSpecies("Meowstic-M-Mega", "Meowsticite")).toBe("Meowstic");
    expect(canonicalSpecies("Meowstic-F-Mega", "Meowsticite")).toBe(
      "Meowstic-F",
    );
  });

  it("keeps the forme of a mega written inline without its stone", () => {
    // The forme of these megas does not start with "Mega", and the form they
    // evolved from is not their `baseSpecies`. Reading either naively turns
    // Meowstic-F-Mega into a plain Meowstic.
    expect(resolveMega("Meowstic-F-Mega", null).displayName).toBe("Meowstic-F");
    expect(resolveMega("Tatsugiri-Droopy-Mega", null).displayName).toBe(
      "Tatsugiri-Droopy",
    );
    expect(resolveMega("Magearna-Original-Mega", null).displayName).toBe(
      "Magearna-Original",
    );
    expect(resolveMega("Floette-Mega", null).displayName).toBe(
      "Floette-Eternal",
    );
    // Rayquaza mega-evolves through a move, so it has no stone to ask.
    expect(resolveMega("Rayquaza-Mega", null).displayName).toBe("Rayquaza");
  });

  it("keeps a base stone and its Z stone apart", () => {
    // M-C is the first time one species has two stones. The lookup is keyed by
    // the item, so Garchompite and Garchompite Z must not bleed into one
    // another in either direction.
    expect(resolveMega("Garchomp", "Garchompite").spriteSpecies).toBe(
      "Garchomp-Mega",
    );
    expect(resolveMega("Garchomp", "Garchompite Z").spriteSpecies).toBe(
      "Garchomp-Mega-Z",
    );
    // The stone decides, even when the paste writes the other forme inline.
    // `canonicalSpecies` runs at parse time, so this is what gets stored and
    // what every later render resolves from.
    expect(canonicalSpecies("Garchomp-Mega-Z", "Garchompite")).toBe("Garchomp");
    expect(resolveMega("Garchomp", "Garchompite").megaAbility).toBe(
      "Sand Force",
    );
  });

  it("reports the one mega ability even when the dex lists a second slot", () => {
    // A mega has exactly one ability. 0.10.11 still gives Baxcalibur-Mega the
    // base species' second slot, which upstream Showdown does not, so reading
    // past slot 0 would wrongly leave an Ice Body Baxcalibur on Ice Body.
    expect(resolveMega("Baxcalibur", "Baxcalibrite").megaAbility).toBe(
      "Thermal Exchange",
    );
  });
});

describe("natureEffect", () => {
  it("uses the standard Showdown stat abbreviations, not translations", () => {
    expect(natureEffect("Jolly")).toEqual({ plus: "Spe", minus: "SpA" });
    expect(natureEffect("Modest")).toEqual({ plus: "SpA", minus: "Atk" });
    expect(natureEffect("Adamant")).toEqual({ plus: "Atk", minus: "SpA" });
    expect(natureEffect("Bold")).toEqual({ plus: "Def", minus: "Atk" });
    expect(natureEffect("Calm")).toEqual({ plus: "SpD", minus: "Atk" });
  });

  it("returns nothing for a neutral nature", () => {
    expect(natureEffect("Serious")).toBeNull();
    expect(natureEffect("Hardy")).toBeNull();
  });

  it("returns nothing for an unknown nature", () => {
    expect(natureEffect("Grumpy")).toBeNull();
  });
});
