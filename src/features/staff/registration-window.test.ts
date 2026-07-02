import { describe, expect, it } from "vitest";
import {
  matchesConfirmationPhrase,
  openRegistrationSchema,
  type RegistrationWindow,
  registrationState,
} from "./registration-window";

const now = new Date("2026-07-02T12:00:00Z");

function windowClosingAt(closesAt: string): RegistrationWindow {
  return {
    id: "w1",
    openedAt: new Date("2026-07-01T00:00:00Z"),
    closesAt: new Date(closesAt),
    openedBy: "u1",
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

describe("matchesConfirmationPhrase", () => {
  it("accepts the exact phrase, trimmed", () => {
    expect(matchesConfirmationPhrase("Saison 1")).toBe(true);
    expect(matchesConfirmationPhrase("  Saison 1  ")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(matchesConfirmationPhrase("saison 1")).toBe(false);
    expect(matchesConfirmationPhrase("Saison")).toBe(false);
    expect(matchesConfirmationPhrase("")).toBe(false);
  });
});

describe("openRegistrationSchema", () => {
  const schema = openRegistrationSchema(now);

  it("accepts a future date with the right confirmation", () => {
    const result = schema.safeParse({
      closesAt: "2026-07-09T12:00:00Z",
      confirmation: "Saison 1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a past date", () => {
    const result = schema.safeParse({
      closesAt: "2026-07-01T12:00:00Z",
      confirmation: "Saison 1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a wrong confirmation phrase", () => {
    const result = schema.safeParse({
      closesAt: "2026-07-09T12:00:00Z",
      confirmation: "nope",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid date", () => {
    const result = schema.safeParse({
      closesAt: "not-a-date",
      confirmation: "Saison 1",
    });
    expect(result.success).toBe(false);
  });
});
