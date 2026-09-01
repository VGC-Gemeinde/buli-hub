import { describe, expect, it } from "vitest";
import {
  openRegistrationSchema,
  type RegistrationWindow,
  registrationState,
  seasonName,
  seasonNumberSchema,
} from "./registration-window";

const now = new Date("2026-07-02T12:00:00Z");

function windowClosingAt(closesAt: string): RegistrationWindow {
  return {
    id: "w1",
    openedAt: new Date("2026-07-01T00:00:00Z"),
    closesAt: new Date(closesAt),
    openedBy: "u1",
    seasonNumber: 9,
    schedulePublishedAt: null,
  };
}

describe("registrationState", () => {
  it("is not_started without a window", () => {
    expect(registrationState(null, now)).toBe("not_started");
  });

  it("is open while closesAt is in the future", () => {
    expect(
      registrationState(windowClosingAt("2026-07-09T12:00:00Z"), now),
    ).toBe("open");
  });

  it("is closed once closesAt has passed", () => {
    expect(
      registrationState(windowClosingAt("2026-07-01T12:00:00Z"), now),
    ).toBe("closed");
  });

  it("is closed exactly at the boundary", () => {
    expect(
      registrationState(windowClosingAt("2026-07-02T12:00:00Z"), now),
    ).toBe("closed");
  });
});

describe("openRegistrationSchema", () => {
  const schema = openRegistrationSchema(now);

  it("accepts a future date", () => {
    const result = schema.safeParse({ closesAt: "2026-07-09T12:00:00Z" });
    expect(result.success).toBe(true);
  });

  it("rejects a past date", () => {
    const result = schema.safeParse({ closesAt: "2026-07-01T12:00:00Z" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid date", () => {
    const result = schema.safeParse({ closesAt: "not-a-date" });
    expect(result.success).toBe(false);
  });
});

describe("seasonNumberSchema", () => {
  it("accepts and coerces a positive integer", () => {
    const result = seasonNumberSchema.safeParse("9");
    expect(result.success && result.data).toBe(9);
  });

  it("rejects zero, negatives and non-integers", () => {
    expect(seasonNumberSchema.safeParse(0).success).toBe(false);
    expect(seasonNumberSchema.safeParse(-3).success).toBe(false);
    expect(seasonNumberSchema.safeParse("2.5").success).toBe(false);
    expect(seasonNumberSchema.safeParse("abc").success).toBe(false);
  });
});

describe("seasonName", () => {
  it("formats the number", () => {
    expect(seasonName(9)).toBe("Saison 9");
  });
});
