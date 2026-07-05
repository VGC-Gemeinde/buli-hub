import { describe, expect, it } from "vitest";
import { parseSpoilersOff, scoreHidden, spoilersOffCookie } from "./spoilers";

describe("scoreHidden", () => {
  it("covers a foreign reported result while protection is on", () => {
    expect(
      scoreHidden({ reported: true, isMine: false, spoilersOff: false }),
    ).toBe(true);
  });

  it("never covers the viewer's own matches", () => {
    expect(
      scoreHidden({ reported: true, isMine: true, spoilersOff: false }),
    ).toBe(false);
  });

  it("covers nothing when the switch is off", () => {
    expect(
      scoreHidden({ reported: true, isMine: false, spoilersOff: true }),
    ).toBe(false);
  });

  it("has nothing to cover on unreported matches", () => {
    expect(
      scoreHidden({ reported: false, isMine: false, spoilersOff: false }),
    ).toBe(false);
  });
});

describe("spoilers cookie", () => {
  it("is protected by default (absent or unknown values)", () => {
    expect(parseSpoilersOff(undefined)).toBe(false);
    expect(parseSpoilersOff("")).toBe(false);
    expect(parseSpoilersOff("0")).toBe(false);
    expect(parseSpoilersOff("1")).toBe(true);
  });

  it("round-trips through the cookie strings", () => {
    expect(spoilersOffCookie(true)).toContain("spoilers_off=1");
    expect(spoilersOffCookie(true)).toContain("max-age=31536000");
    // Opting back in drops the cookie → back to the protected default.
    expect(spoilersOffCookie(false)).toContain("max-age=0");
  });
});
