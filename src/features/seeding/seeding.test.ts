import { describe, expect, it } from "vitest";
import { divisionName, seedingConfigSchema, subDivisionName } from "./seeding";

describe("divisionName", () => {
  it("names divisions by tier", () => {
    expect(divisionName(1)).toBe("Division 1");
    expect(divisionName(3)).toBe("Division 3");
  });
});

describe("subDivisionName", () => {
  it("appends a letter for the 0-based group position", () => {
    expect(subDivisionName(1, 0)).toBe("Division 1a");
    expect(subDivisionName(1, 1)).toBe("Division 1b");
    expect(subDivisionName(2, 2)).toBe("Division 2c");
  });
});

describe("seedingConfigSchema", () => {
  it("accepts a valid config", () => {
    expect(
      seedingConfigSchema.parse({ subDivisionSize: 8, divisionCount: 3 }),
    ).toEqual({ subDivisionSize: 8, divisionCount: 3 });
  });

  it("coerces numeric strings (from form inputs)", () => {
    expect(
      seedingConfigSchema.parse({ subDivisionSize: "8", divisionCount: "3" }),
    ).toEqual({ subDivisionSize: 8, divisionCount: 3 });
  });

  it("rejects a sub-division size below 2", () => {
    expect(
      seedingConfigSchema.safeParse({ subDivisionSize: 1, divisionCount: 3 })
        .success,
    ).toBe(false);
  });

  it("rejects a division count below 1", () => {
    expect(
      seedingConfigSchema.safeParse({ subDivisionSize: 8, divisionCount: 0 })
        .success,
    ).toBe(false);
  });

  it("rejects non-integers", () => {
    expect(
      seedingConfigSchema.safeParse({ subDivisionSize: 8.5, divisionCount: 3 })
        .success,
    ).toBe(false);
  });
});
