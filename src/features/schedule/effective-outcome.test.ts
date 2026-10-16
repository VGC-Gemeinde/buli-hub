import { describe, expect, it } from "vitest";
import { effectiveOutcome } from "./effective-outcome";

const none = new Set<string>();
const base = {
  playerAId: "a",
  playerBId: "b",
  stored: null,
  droppedIds: none,
  lateDroppedIds: none,
};

describe("effectiveOutcome", () => {
  it("is open without a result", () => {
    expect(effectiveOutcome(base)).toEqual({ kind: "none" });
  });

  it("counts a played result and a confirmed free win", () => {
    expect(
      effectiveOutcome({
        ...base,
        stored: { outcome: "normal", winnerId: "b", confirmedAt: null },
      }),
    ).toEqual({ kind: "won", winnerId: "b" });
    expect(
      effectiveOutcome({
        ...base,
        stored: { outcome: "free_win", winnerId: "a", confirmedAt: null },
      }),
    ).toEqual({ kind: "none" });
  });

  it("lets a late drop decide only an unplayed match", () => {
    const late = new Set(["a"]);
    expect(effectiveOutcome({ ...base, lateDroppedIds: late })).toEqual({
      kind: "won",
      winnerId: "b",
    });
    expect(
      effectiveOutcome({
        ...base,
        lateDroppedIds: late,
        stored: { outcome: "normal", winnerId: "a", confirmedAt: null },
      }),
    ).toEqual({ kind: "won", winnerId: "a" });
  });

  it("lets a regular-season drop override even a played result", () => {
    expect(
      effectiveOutcome({
        ...base,
        droppedIds: new Set(["a"]),
        stored: { outcome: "normal", winnerId: "a", confirmedAt: null },
      }),
    ).toEqual({ kind: "won", winnerId: "b" });
  });

  it("makes both absent a double loss", () => {
    expect(
      effectiveOutcome({ ...base, lateDroppedIds: new Set(["a", "b"]) }),
    ).toEqual({ kind: "double_loss" });
  });

  it("gives the match to whoever plays an empty seat", () => {
    expect(
      effectiveOutcome({ ...base, playerBId: null, vacantB: true }),
    ).toEqual({ kind: "won", winnerId: "a" });
    expect(
      effectiveOutcome({
        ...base,
        playerAId: null,
        playerBId: null,
        vacantA: true,
        vacantB: true,
      }),
    ).toEqual({ kind: "double_loss" });
  });
});
