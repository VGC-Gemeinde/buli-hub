import { describe, expect, it } from "vitest";
import {
  formatGermanDateTime,
  formatGermanDay,
  germanToday,
} from "./german-time";

describe("germanToday", () => {
  it("uses the German calendar day, not the UTC one", () => {
    // 22:30 UTC on July 5th is already 00:30 on July 6th in Berlin (CEST).
    expect(germanToday(new Date("2026-07-05T22:30:00Z"))).toBe("2026-07-06");
    // 23:30 UTC on Jan 5th is 00:30 on Jan 6th in Berlin (CET).
    expect(germanToday(new Date("2026-01-05T23:30:00Z"))).toBe("2026-01-06");
    // Well inside the same day on both clocks.
    expect(germanToday(new Date("2026-07-05T12:00:00Z"))).toBe("2026-07-05");
  });
});

describe("formatGermanDateTime", () => {
  it("renders instants in German time regardless of runtime timezone", () => {
    // 22:30 UTC → 00:30 next day in Berlin.
    expect(
      formatGermanDateTime(new Date("2026-07-05T22:30:00Z"), {
        dateStyle: "short",
        timeStyle: "short",
      }),
    ).toBe("06.07.26, 00:30");
  });
});

describe("formatGermanDay", () => {
  it("renders a day string as exactly that calendar day", () => {
    expect(
      formatGermanDay("2026-07-05", { day: "2-digit", month: "2-digit" }),
    ).toBe("05.07.");
  });
});
