import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type Fetchers, resolveTeamsheet } from "./resolve";

const pokepasteRaw = readFileSync(
  new URL("./fixtures/pokepaste-raw.txt", import.meta.url),
  "utf8",
);
const vrpasteResponse = JSON.parse(
  readFileSync(
    new URL("./fixtures/vrpaste-response.json", import.meta.url),
    "utf8",
  ),
);

// Fetchers are injected, so nothing here touches the network — including the
// "the service is down" cases, which are the whole reason the seam exists.
function fetchers(overrides: Partial<Fetchers> = {}): Fetchers {
  return {
    text: async () => pokepasteRaw,
    json: async () => vrpasteResponse,
    ...overrides,
  };
}

const VRPASTE_DOWN =
  "VRPaste ist gerade nicht erreichbar. Bitte einen Pokepaste-Link angeben oder das Team direkt aus Showdown importieren.";

describe("resolveTeamsheet — the three routes", () => {
  it("resolves a pokepaste link", async () => {
    const result = await resolveTeamsheet(
      "https://pokepast.es/b89ff7cbd139fbcb",
      fetchers(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("pokepaste");
      expect(result.mons).toHaveLength(6);
    }
  });

  it("resolves a vrpaste link", async () => {
    const result = await resolveTeamsheet(
      "https://www.vrpastes.com/uQ8gaGGC",
      fetchers(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("vrpaste");
      expect(result.mons).toHaveLength(6);
    }
  });

  it("resolves a pasted showdown export without any fetch", async () => {
    let fetched = false;
    const result = await resolveTeamsheet(pokepasteRaw, {
      text: async () => {
        fetched = true;
        return null;
      },
      json: async () => {
        fetched = true;
        return null;
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("import");
    }
    expect(fetched).toBe(false);
  });

  it("strips the stats no matter which route was used", async () => {
    for (const value of [
      "https://pokepast.es/b89ff7cbd139fbcb",
      "https://www.vrpastes.com/uQ8gaGGC",
      pokepasteRaw,
    ]) {
      const result = await resolveTeamsheet(value, fetchers());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ots).not.toContain("EVs:");
        expect(result.ots).not.toContain("IVs:");
        expect(result.ots).not.toContain("Level:");
      }
    }
  });
});

describe("resolveTeamsheet — services failing", () => {
  it("names the two alternatives when vrpaste is unreachable", async () => {
    const result = await resolveTeamsheet(
      "https://vrpastes.com/uQ8gaGGC",
      fetchers({ json: async () => null }),
    );
    expect(result).toEqual({ ok: false, error: VRPASTE_DOWN });
  });

  it("names the two alternatives when vrpaste answers with something else", async () => {
    const result = await resolveTeamsheet(
      "https://vrpastes.com/uQ8gaGGC",
      fetchers({ json: async () => ({ error: "gone" }) }),
    );
    expect(result).toEqual({ ok: false, error: VRPASTE_DOWN });
  });

  it("reports an unreachable pokepaste against the link, not the team", async () => {
    const result = await resolveTeamsheet(
      "https://pokepast.es/deadbeef",
      fetchers({ text: async () => null }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        "Dieses Pokepaste konnte nicht geladen werden. Bitte den Link prüfen.",
      );
      expect(result.details).toBeUndefined();
    }
  });
});

describe("resolveTeamsheet — rejected input", () => {
  it("rejects an unsupported link before fetching anything", async () => {
    const result = await resolveTeamsheet("https://smogon.com/abc", fetchers());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        "Das ist weder ein Pokepaste- oder VRPaste-Link noch ein Showdown-Export.",
      );
    }
  });

  it("passes the per-mon problems through as details", async () => {
    const incomplete = [
      "Garchomp @ Life Orb\nAbility: Rough Skin\n- Earthquake",
      "Whimsicott @ Occa Berry\nAbility: Prankster\nTimid Nature\n- Tailwind",
    ].join("\n\n");
    const result = await resolveTeamsheet(incomplete, fetchers());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Das Teamsheet ist nicht vollständig.");
      expect(result.details).toContain(
        "Das Team braucht genau 6 Pokémon. Gefunden: 2.",
      );
      expect(result.details).toContain("Garchomp: Wesen fehlt.");
    }
  });

  it("rejects an empty value", async () => {
    const result = await resolveTeamsheet("   ", fetchers());
    expect(result.ok).toBe(false);
  });
});
