import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTeamsheet } from "./parse";
import { vrpasteToShowdown } from "./vrpaste";

// A real, checked-in response from the VRPaste API. Nothing here goes to the
// network — that API is undocumented and may change or vanish, which is exactly
// why the conversion is a pure function with a frozen fixture.
const response = JSON.parse(
  readFileSync(
    new URL("./fixtures/vrpaste-response.json", import.meta.url),
    "utf8",
  ),
);

describe("vrpasteToShowdown", () => {
  it("converts a real response into a valid sheet", () => {
    const text = vrpasteToShowdown(response);
    expect(text).not.toBeNull();
    const parsed = parseTeamsheet(text as string);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.mons).toHaveLength(6);
      expect(parsed.mons.map((mon) => mon.species)).toEqual([
        "Staraptor",
        "Garchomp",
        "Whimsicott",
        "Delphox",
        "Glimmora",
        "Kingambit",
      ]);
    }
  });

  it("writes the base species plus the stone, ignoring the mega block", () => {
    // The API returns species "Staraptor" with a separate megaEvolution block;
    // resolveMega derives the mega again at render time, so storing it would be
    // duplicate state.
    const text = vrpasteToShowdown(response) as string;
    expect(text).toContain("Staraptor @ Staraptite");
    expect(text).not.toContain("Staraptor-Mega");
  });

  it("agrees with the pokepaste route on the same mon", () => {
    const fromApi = parseTeamsheet(vrpasteToShowdown(response) as string);
    const fromExport = parseTeamsheet(
      [
        // How Pokepaste writes the very same mon.
        "Staraptor-Mega @ Staraptite\nAbility: Intimidate\nJolly Nature\n- Protect",
        "Garchomp @ Life Orb\nAbility: Rough Skin\nJolly Nature\n- Protect",
        "Whimsicott @ Occa Berry\nAbility: Prankster\nTimid Nature\n- Protect",
        "Delphox @ Delphoxite\nAbility: Magician\nModest Nature\n- Protect",
        "Glimmora @ Focus Sash\nAbility: Toxic Debris\nTimid Nature\n- Protect",
        "Kingambit @ Chople Berry\nAbility: Defiant\nAdamant Nature\n- Protect",
      ].join("\n\n"),
    );
    expect(fromApi.ok && fromExport.ok).toBe(true);
    if (fromApi.ok && fromExport.ok) {
      expect(fromApi.mons[0].species).toBe(fromExport.mons[0].species);
    }
  });

  it("keeps a mon that holds no item", () => {
    const text = vrpasteToShowdown({
      teams: [
        {
          species: "Whimsicott",
          item: null,
          ability: "Prankster",
          nature: "Timid",
          moves: ["Tailwind"],
        },
      ],
    });
    expect(text).toBe(
      "Whimsicott\nAbility: Prankster\nTimid Nature\n- Tailwind\n",
    );
  });

  it("passes an incomplete mon through so the parser reports it", () => {
    // Conversion is not validation: a mon missing its nature must reach
    // parseTeamsheet and produce the same message as every other route.
    const text = vrpasteToShowdown({
      teams: [
        { species: "Whimsicott", ability: "Prankster", moves: ["Tailwind"] },
      ],
    });
    expect(text).not.toBeNull();
    expect(text).not.toContain("Nature");
  });
});

describe("vrpasteToShowdown — unusable responses", () => {
  it.each([
    ["an error object", { error: "not found" }],
    ["a missing teams array", { id: "abc", title: "VR" }],
    ["an empty team", { teams: [] }],
    ["a teams field of the wrong type", { teams: "nope" }],
    ["null", null],
    ["a string", "<!doctype html>"],
  ])("returns null for %s", (_label, payload) => {
    expect(vrpasteToShowdown(payload)).toBeNull();
  });
});
