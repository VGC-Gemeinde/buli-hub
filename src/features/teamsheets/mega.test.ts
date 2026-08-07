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

  it("never throws on a species the dex does not know", () => {
    expect(resolveMega("Fakemon", "Fakeite")).toEqual({
      spriteSpecies: "Fakemon",
      displayName: "Fakemon",
      megaAbility: null,
    });
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
