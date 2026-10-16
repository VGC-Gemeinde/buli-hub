import { describe, expect, it } from "vitest";
import { formatCount, formatShare, formatWinRate } from "./format";

describe("formatShare", () => {
  it("writes one decimal with a narrow no-break space", () => {
    expect(formatShare(0.413)).toBe("41,3 %");
    expect(formatShare(1)).toBe("100,0 %");
    expect(formatShare(0)).toBe("0,0 %");
    expect(formatShare(6)).toBe("600,0 %");
  });
  it("never rounds a share above 0 to nothing", () => {
    expect(formatShare(1 / 2472)).toBe("<0,1 %");
    expect(formatShare(0.0005)).toBe("0,1 %");
  });
});

describe("formatWinRate", () => {
  it("is the placeholder without a rated match", () => {
    expect(formatWinRate(0, 0)).toBe("—");
    expect(formatWinRate(0, 1)).toBe("0,0 %");
    expect(formatWinRate(54, 100)).toBe("54,0 %");
  });
});

describe("formatCount", () => {
  it("groups thousands", () => {
    expect(formatCount(2472)).toBe("2.472");
  });
});
