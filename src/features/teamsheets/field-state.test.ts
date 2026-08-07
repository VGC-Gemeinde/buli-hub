import { describe, expect, it } from "vitest";
import {
  cleared,
  emptyTeamsheet,
  isAccepted,
  shouldValidateLink,
  storedTeamsheet,
  withAccepted,
  withError,
  withLink,
} from "./field-state";

const accepted = {
  source: "pokepaste" as const,
  ots: "Garchomp @ Life Orb",
  icons: [],
};

describe("emptyTeamsheet", () => {
  it("starts with nothing accepted", () => {
    const value = emptyTeamsheet();
    expect(isAccepted(value)).toBe(false);
    expect(value).toEqual({
      link: "",
      accepted: null,
      imported: false,
      error: null,
      details: [],
    });
  });
});

describe("withLink", () => {
  it("invalidates a previously accepted link when the field is edited", () => {
    // Otherwise the ✓ would keep claiming a link that no longer says that.
    const value = withAccepted(
      withLink(emptyTeamsheet(), "https://pokepast.es/aaa"),
      accepted,
      false,
    );
    expect(isAccepted(value)).toBe(true);
    const edited = withLink(value, "https://pokepast.es/bbb");
    expect(isAccepted(edited)).toBe(false);
    expect(edited.link).toBe("https://pokepast.es/bbb");
  });

  it("clears a previous error", () => {
    const value = withError(emptyTeamsheet(), "kaputt", [
      "Delphox: Wesen fehlt.",
    ]);
    const edited = withLink(value, "https://pokepast.es/ccc");
    expect(edited.error).toBeNull();
    expect(edited.details).toEqual([]);
  });

  it("leaves an imported sheet alone: its link field is not on screen", () => {
    const imported = withAccepted(emptyTeamsheet(), accepted, true);
    expect(withLink(imported, "tippt jemand")).toBe(imported);
  });
});

describe("withAccepted", () => {
  it("records whether the sheet came from the modal", () => {
    expect(withAccepted(emptyTeamsheet(), accepted, true).imported).toBe(true);
    expect(withAccepted(emptyTeamsheet(), accepted, false).imported).toBe(
      false,
    );
  });

  it("clears any error the previous attempt left", () => {
    const failed = withError(emptyTeamsheet(), "kaputt", ["Detail"]);
    const value = withAccepted(failed, accepted, false);
    expect(value.error).toBeNull();
    expect(value.details).toEqual([]);
  });
});

describe("withError", () => {
  it("drops the accepted sheet so the form cannot be submitted", () => {
    const value = withError(
      withAccepted(emptyTeamsheet(), accepted, false),
      "VRPaste ist gerade nicht erreichbar.",
    );
    expect(isAccepted(value)).toBe(false);
  });
});

describe("storedTeamsheet", () => {
  it("opens as an imported sheet with no link, because none was stored", () => {
    const value = storedTeamsheet("vrpaste", "Garchomp @ Life Orb", []);
    expect(value.imported).toBe(true);
    expect(value.link).toBe("");
    expect(value.accepted?.source).toBe("vrpaste");
  });
});

describe("cleared", () => {
  it("returns an imported slot to an empty link field", () => {
    expect(cleared()).toEqual(emptyTeamsheet());
  });
});

describe("shouldValidateLink", () => {
  it("validates a non-empty, not-yet-validated link", () => {
    expect(shouldValidateLink(withLink(emptyTeamsheet(), "https://x/y"))).toBe(
      true,
    );
  });

  it.each([
    ["empty", emptyTeamsheet()],
    ["whitespace only", withLink(emptyTeamsheet(), "   ")],
    [
      "already validated",
      withAccepted(withLink(emptyTeamsheet(), "https://x/y"), accepted, false),
    ],
    ["imported", withAccepted(emptyTeamsheet(), accepted, true)],
  ])("does not re-validate when %s", (_label, value) => {
    expect(shouldValidateLink(value)).toBe(false);
  });
});
