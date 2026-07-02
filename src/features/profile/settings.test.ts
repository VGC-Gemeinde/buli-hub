import { describe, expect, it } from "vitest";
import { REGIONS } from "./regions";
import { originToFormState, profileSettingsSchema } from "./settings";

describe("profileSettingsSchema", () => {
  it("passes through clean values", () => {
    expect(
      profileSettingsSchema.parse({
        twitterHandle: "kuro",
        blueskyHandle: "kuro.bsky.social",
        origin: "Bayern",
        hasCaptureCard: false,
      }),
    ).toEqual({
      twitterHandle: "kuro",
      blueskyHandle: "kuro.bsky.social",
      origin: "Bayern",
      hasCaptureCard: false,
    });
  });

  it("trims and strips leading @ from handles", () => {
    const result = profileSettingsSchema.parse({
      twitterHandle: "  @kuro ",
      blueskyHandle: "@kuro.bsky.social",
      origin: "",
      hasCaptureCard: false,
    });
    expect(result.twitterHandle).toBe("kuro");
    expect(result.blueskyHandle).toBe("kuro.bsky.social");
  });

  it("lowercases the Bluesky handle but not the Twitter handle", () => {
    const result = profileSettingsSchema.parse({
      twitterHandle: "Kuro",
      blueskyHandle: "Kuro.Bsky.Social",
      origin: "",
      hasCaptureCard: false,
    });
    expect(result.twitterHandle).toBe("Kuro");
    expect(result.blueskyHandle).toBe("kuro.bsky.social");
  });

  it("normalizes empty and whitespace-only values to null", () => {
    expect(
      profileSettingsSchema.parse({
        twitterHandle: "",
        blueskyHandle: "   ",
        origin: " ",
        hasCaptureCard: false,
      }),
    ).toEqual({
      twitterHandle: null,
      blueskyHandle: null,
      origin: null,
      hasCaptureCard: false,
    });
  });

  it("normalizes a lone @ to null", () => {
    const result = profileSettingsSchema.parse({
      twitterHandle: "@",
      blueskyHandle: "@",
      origin: "",
      hasCaptureCard: false,
    });
    expect(result.twitterHandle).toBeNull();
    expect(result.blueskyHandle).toBeNull();
  });

  it("rejects values over 100 characters", () => {
    const result = profileSettingsSchema.safeParse({
      twitterHandle: "a".repeat(101),
      blueskyHandle: "",
      origin: "",
      hasCaptureCard: false,
    });
    expect(result.success).toBe(false);
  });

  it("keeps free-text origin as typed (trimmed)", () => {
    const result = profileSettingsSchema.parse({
      twitterHandle: "",
      blueskyHandle: "",
      origin: "  Südtirol ",
      hasCaptureCard: false,
    });
    expect(result.origin).toBe("Südtirol");
  });

  it("rejects non-string values", () => {
    const result = profileSettingsSchema.safeParse({
      twitterHandle: 42,
      blueskyHandle: "",
      origin: "",
      hasCaptureCard: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("originToFormState", () => {
  it("maps null and empty to none", () => {
    expect(originToFormState(null)).toEqual({ kind: "none" });
    expect(originToFormState("")).toEqual({ kind: "none" });
  });

  it("maps every known region to the region branch", () => {
    for (const region of REGIONS) {
      expect(originToFormState(region)).toEqual({ kind: "region", region });
    }
  });

  it("maps unknown values to the other branch", () => {
    expect(originToFormState("Südtirol")).toEqual({
      kind: "other",
      text: "Südtirol",
    });
  });

  it("is case-sensitive for region matching", () => {
    expect(originToFormState("bayern")).toEqual({
      kind: "other",
      text: "bayern",
    });
  });
});
