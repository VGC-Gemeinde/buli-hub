import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTeamsheet } from "./parse";

const pokepasteRaw = readFileSync(
  new URL("./fixtures/pokepaste-raw.txt", import.meta.url),
  "utf8",
);

// A minimal valid mon, so tests can vary exactly one thing.
function mon(overrides: Partial<Record<string, string>> = {}, index = 0) {
  const {
    species = `Garchomp`,
    item = "@ Life Orb",
    ability = "Ability: Rough Skin",
    nature = "Jolly Nature",
    moves = "- Earthquake",
  } = overrides;
  return [
    `${species}${index ? `-${index}` : ""} ${item}`.trim(),
    ability,
    nature,
    moves,
  ]
    .filter(Boolean)
    .join("\n");
}

// Six distinct valid mons.
function team(count = 6): string {
  const species = [
    "Garchomp",
    "Whimsicott",
    "Kingambit",
    "Sneasler",
    "Glimmora",
    "Delphox",
    "Staraptor",
  ];
  return species
    .slice(0, count)
    .map((name) =>
      [
        `${name} @ Life Orb`,
        "Ability: Rough Skin",
        "Jolly Nature",
        "- Protect",
      ].join("\n"),
    )
    .join("\n\n");
}

describe("parseTeamsheet — team size", () => {
  it("accepts exactly six", () => {
    const result = parseTeamsheet(team(6));
    expect(result.ok).toBe(true);
  });

  it.each([1, 5, 7])("rejects %i", (count) => {
    const result = parseTeamsheet(team(count));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toBe(
        `Das Team braucht genau 6 Pokémon. Gefunden: ${count}.`,
      );
    }
  });

  it("rejects text that is not an export at all", () => {
    const result = parseTeamsheet("hallo, hier ist mein team");
    expect(result.ok).toBe(false);
  });

  it("rejects empty input", () => {
    expect(parseTeamsheet("").ok).toBe(false);
    expect(parseTeamsheet("   \n  ").ok).toBe(false);
  });
});

describe("parseTeamsheet — per-mon requirements", () => {
  function withFirst(first: string): string {
    return [first, team(6).split("\n\n").slice(1).join("\n\n")].join("\n\n");
  }

  it("names the mon that is missing its ability", () => {
    const result = parseTeamsheet(
      withFirst(mon({ species: "Delphox", ability: "" })),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Delphox: Fähigkeit fehlt.");
    }
  });

  it("names the mon that is missing its nature", () => {
    const result = parseTeamsheet(
      withFirst(mon({ species: "Delphox", nature: "" })),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Delphox: Wesen fehlt.");
    }
  });

  it("requires at least one move", () => {
    const result = parseTeamsheet(
      withFirst(mon({ species: "Delphox", moves: "" })),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain(
        "Delphox: mindestens eine Attacke angeben.",
      );
    }
  });

  it("allows one, two, three and four moves", () => {
    for (const moves of [
      "- Protect",
      "- Protect\n- Earthquake",
      "- Protect\n- Earthquake\n- Rock Slide",
      "- Protect\n- Earthquake\n- Rock Slide\n- Dragon Claw",
    ]) {
      const result = parseTeamsheet(withFirst(mon({ moves })));
      expect(result.ok).toBe(true);
    }
  });

  it("rejects a fifth move", () => {
    const result = parseTeamsheet(
      withFirst(
        mon({
          species: "Delphox",
          moves:
            "- Protect\n- Earthquake\n- Rock Slide\n- Dragon Claw\n- Swords Dance",
        }),
      ),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Delphox: höchstens 4 Attacken.");
    }
  });

  it("treats a missing item as valid", () => {
    const result = parseTeamsheet(withFirst(mon({ item: "" })));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mons[0].item).toBeNull();
      expect(result.ots).toContain("Garchomp  \n");
    }
  });

  it("reports every problem at once, not just the first", () => {
    const result = parseTeamsheet(
      withFirst(
        mon({ species: "Delphox", ability: "", nature: "", moves: "" }),
      ),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(3);
    }
  });
});

describe("parseTeamsheet — stripping", () => {
  const loaded = [
    "Chompy (Garchomp) (M) @ Life Orb",
    "Ability: Rough Skin",
    "Level: 50",
    "Shiny: Yes",
    "Happiness: 160",
    "Tera Type: Steel",
    "EVs: 17 HP / 2 Def / 31 SpA / 16 Spe",
    "IVs: 0 Atk",
    "Jolly Nature",
    "- Earthquake",
  ].join("\n");

  const result = parseTeamsheet(
    [loaded, team(6).split("\n\n").slice(1).join("\n\n")].join("\n\n"),
  );

  it("parses a fully loaded set", () => {
    expect(result.ok).toBe(true);
  });

  it.each([
    ["EVs", "EVs:"],
    ["IVs", "IVs:"],
    ["level", "Level:"],
    ["Tera type", "Tera Type:"],
    ["shininess", "Shiny:"],
    ["happiness", "Happiness:"],
  ])("drops %s", (_label, marker) => {
    if (result.ok) {
      expect(result.ots).not.toContain(marker);
    }
  });

  it("drops the nickname and gender, keeping the species", () => {
    if (result.ok) {
      expect(result.ots).not.toContain("Chompy");
      expect(result.ots).not.toContain("(M)");
      expect(result.ots.startsWith("Garchomp @ Life Orb")).toBe(true);
    }
  });

  it("keeps exactly the five fields we promise", () => {
    if (result.ok) {
      expect(result.mons[0]).toEqual({
        species: "Garchomp",
        item: "Life Orb",
        ability: "Rough Skin",
        nature: "Jolly",
        moves: ["Earthquake"],
      });
    }
  });

  it("survives CRLF line endings", () => {
    const crlf = parseTeamsheet(team(6).replace(/\n/g, "\r\n"));
    expect(crlf.ok).toBe(true);
  });
});

describe("parseTeamsheet — canonical output", () => {
  it("is idempotent: re-parsing its own output changes nothing", () => {
    const first = parseTeamsheet(pokepasteRaw);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const second = parseTeamsheet(first.ots);
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.ots).toBe(first.ots);
      expect(second.mons).toEqual(first.mons);
    }
  });

  it("accepts a real pokepaste export and strips its stats", () => {
    const result = parseTeamsheet(pokepasteRaw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mons).toHaveLength(6);
      expect(result.ots).not.toContain("EVs:");
      expect(result.ots).not.toContain("Level:");
    }
  });
});
