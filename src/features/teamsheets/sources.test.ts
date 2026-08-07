import { describe, expect, it } from "vitest";
import { classifyInput, pokepasteRawUrl, vrpasteApiUrl } from "./sources";

describe("classifyInput — pokepaste", () => {
  it.each([
    "https://pokepast.es/b89ff7cbd139fbcb",
    "https://www.pokepast.es/b89ff7cbd139fbcb",
    "http://pokepast.es/b89ff7cbd139fbcb",
    "https://pokepast.es/b89ff7cbd139fbcb/",
    // Someone who copied the API URL meant the paste.
    "https://pokepast.es/b89ff7cbd139fbcb/raw",
    "https://pokepast.es/b89ff7cbd139fbcb/json",
    // Pasted without the protocol.
    "pokepast.es/b89ff7cbd139fbcb",
    "www.pokepast.es/b89ff7cbd139fbcb",
    // Stray whitespace from copying.
    "  https://pokepast.es/b89ff7cbd139fbcb  ",
  ])("recognises %s", (value) => {
    expect(classifyInput(value)).toEqual({
      kind: "pokepaste",
      id: "b89ff7cbd139fbcb",
    });
  });

  it("rejects the bare host with no paste id", () => {
    expect(classifyInput("https://pokepast.es/").kind).toBe("invalid");
    expect(classifyInput("https://pokepast.es").kind).toBe("invalid");
  });
});

describe("classifyInput — vrpaste", () => {
  it.each([
    "https://www.vrpastes.com/uQ8gaGGC",
    "https://vrpastes.com/uQ8gaGGC",
    "http://vrpastes.com/uQ8gaGGC",
    "vrpastes.com/uQ8gaGGC",
    "https://vrpastes.com/uQ8gaGGC/",
  ])("recognises %s", (value) => {
    expect(classifyInput(value)).toEqual({ kind: "vrpaste", id: "uQ8gaGGC" });
  });
});

describe("classifyInput — imports", () => {
  it("treats a Showdown export as an import", () => {
    const paste = "Garchomp @ Life Orb\nAbility: Rough Skin\n- Earthquake";
    expect(classifyInput(paste)).toEqual({ kind: "import", text: paste });
  });

  it("treats a single-line set as an import, not a URL", () => {
    // "Garchomp @ Life Orb" contains spaces, so it can never be a link.
    const value = "Garchomp @ Life Orb";
    expect(classifyInput(value)).toEqual({ kind: "import", text: value });
  });

  it("treats a bare word as an import so the team parser explains it", () => {
    expect(classifyInput("Garchomp")).toEqual({
      kind: "import",
      text: "Garchomp",
    });
  });

  it("trims before deciding", () => {
    expect(classifyInput("\n  Garchomp @ Life Orb\n  ")).toEqual({
      kind: "import",
      text: "Garchomp @ Life Orb",
    });
  });
});

describe("classifyInput — rejected", () => {
  it.each([
    "https://pokepaste.es/abc",
    "https://smogon.com/b89ff7cbd139fbcb",
    "https://replay.pokemonshowdown.com/gen9vgc-1",
    "https://vrpaste.com/uQ8gaGGC",
    "ftp://pokepast.es/abc",
  ])("rejects the unsupported link %s", (value) => {
    expect(classifyInput(value).kind).toBe("invalid");
  });

  it("rejects empty input", () => {
    expect(classifyInput("").kind).toBe("invalid");
    expect(classifyInput("   ").kind).toBe("invalid");
  });
});

describe("service URLs", () => {
  it("builds the pokepaste raw endpoint", () => {
    expect(pokepasteRawUrl("b89ff7cbd139fbcb")).toBe(
      "https://pokepast.es/b89ff7cbd139fbcb/raw",
    );
  });

  it("builds the vrpaste api endpoint with the english locale", () => {
    expect(vrpasteApiUrl("uQ8gaGGC")).toBe(
      "https://vrpaste-backend.vercel.app/api/paste/uQ8gaGGC?lang=english",
    );
  });
});
