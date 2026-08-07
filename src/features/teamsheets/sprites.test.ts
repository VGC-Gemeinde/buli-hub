import { describe, expect, it } from "vitest";
import { iconFor, itemSpriteFor, spriteFor, spriteId } from "./sprites";

describe("spriteId", () => {
  it("derives the Showdown basename", () => {
    expect(spriteId("Garchomp")).toBe("garchomp");
    expect(spriteId("Delphox-Mega")).toBe("delphox-mega");
  });
});

describe("spriteFor", () => {
  it("serves both variants from the bucket for a hosted species", () => {
    const sprite = spriteFor("Garchomp");
    expect(sprite.animated).toMatch(/\/garchomp\.webp$/);
    expect(sprite.still).toMatch(/\/garchomp\.png$/);
    expect(sprite.pixelated).toBe(false);
  });

  it("covers the Champions megas", () => {
    for (const species of ["Delphox-Mega", "Staraptor-Mega"]) {
      expect(spriteFor(species).animated).not.toBeNull();
    }
  });

  it("falls back to the Showdown CDN for a species the bucket lacks", () => {
    const sprite = spriteFor("Fakemon");
    expect(sprite.animated).toBeNull();
    expect(sprite.still).toContain("pokemonshowdown.com");
  });
});

describe("iconFor", () => {
  it("serves the pre-sliced box icon for a hosted species", () => {
    const icon = iconFor("Garchomp");
    expect(icon.url).toMatch(/\/pokemon-pixel\/garchomp\.png$/);
  });

  it("falls back to the full sprite for a species the bucket lacks", () => {
    expect(iconFor("Fakemon").url).toContain("pokemonshowdown.com");
  });
});

describe("itemSpriteFor", () => {
  it("serves a hosted item render", () => {
    expect(itemSpriteFor("Life Orb")).toEqual({
      kind: "image",
      url: expect.stringMatching(/\/items\/lifeorb\.png$/),
    });
  });

  it("covers the Champions stones", () => {
    const icon = itemSpriteFor("Delphoxite");
    expect(icon).toMatchObject({ kind: "image" });
  });

  it("returns nothing for a mon holding no item", () => {
    expect(itemSpriteFor(null)).toBeNull();
    expect(itemSpriteFor("")).toBeNull();
  });

  it("shows no icon at all for an item the dex does not know", () => {
    // Showdown's sheet answers an unknown item with cell 0,0, i.e. a real icon
    // for a different item. Nothing is better than something wrong.
    expect(itemSpriteFor("Fakeite")).toBeNull();
  });
});
