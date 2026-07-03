import { describe, expect, it } from "vitest";
import { matchesConfirmationPhrase } from "./confirm";

describe("matchesConfirmationPhrase", () => {
  it("matches the exact phrase", () => {
    expect(
      matchesConfirmationPhrase("Anmeldung öffnen", "Anmeldung öffnen"),
    ).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(
      matchesConfirmationPhrase("  Anmeldung öffnen  ", "Anmeldung öffnen"),
    ).toBe(true);
  });

  it("rejects a different phrase", () => {
    expect(
      matchesConfirmationPhrase("Einteilung finalisieren", "Anmeldung öffnen"),
    ).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(
      matchesConfirmationPhrase("anmeldung öffnen", "Anmeldung öffnen"),
    ).toBe(false);
  });

  it("rejects empty input", () => {
    expect(matchesConfirmationPhrase("", "Anmeldung öffnen")).toBe(false);
  });
});
