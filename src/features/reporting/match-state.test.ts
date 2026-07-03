import { describe, expect, it } from "vitest";
import type { Identity } from "@/features/season/dashboard";
import { matchDisplayState, scoreFor } from "./match-state";

const opp: Identity = { userId: "b", name: "Opp", avatarUrl: null };
const week = { startsOn: "2026-07-08", endsOn: "2026-07-14", opponent: opp };

describe("matchDisplayState", () => {
  it("a recorded normal result is reported, regardless of date", () => {
    expect(
      matchDisplayState({
        match: { ...week, endsOn: "2026-01-01" },
        result: { outcome: "normal", confirmedAt: null },
        today: "2026-07-10",
      }),
    ).toBe("reported");
  });
  it("a pending free win is pending; a confirmed one is reported", () => {
    expect(
      matchDisplayState({
        match: week,
        result: { outcome: "free_win", confirmedAt: null },
        today: "2026-07-10",
      }),
    ).toBe("pending_free_win");
    expect(
      matchDisplayState({
        match: week,
        result: { outcome: "free_win", confirmedAt: new Date() },
        today: "2026-07-10",
      }),
    ).toBe("reported");
  });
  it("no result: current within the window, upcoming before, overdue after", () => {
    expect(
      matchDisplayState({ match: week, result: null, today: "2026-07-10" }),
    ).toBe("current");
    expect(
      matchDisplayState({ match: week, result: null, today: "2026-07-01" }),
    ).toBe("upcoming");
    expect(
      matchDisplayState({ match: week, result: null, today: "2026-07-20" }),
    ).toBe("overdue");
  });
  it("includes the window boundaries as current", () => {
    expect(
      matchDisplayState({ match: week, result: null, today: "2026-07-08" }),
    ).toBe("current");
    expect(
      matchDisplayState({ match: week, result: null, today: "2026-07-14" }),
    ).toBe("current");
  });
  it("a past bye is never overdue", () => {
    expect(
      matchDisplayState({
        match: { ...week, opponent: null },
        result: null,
        today: "2026-07-20",
      }),
    ).toBe("upcoming");
  });
});

describe("scoreFor", () => {
  const games = [{ winnerId: "a" }, { winnerId: "b" }, { winnerId: "a" }];
  it("reads the score from the given player's side", () => {
    expect(scoreFor("a", { outcome: "normal", winnerId: "a", games })).toEqual({
      self: 2,
      opponent: 1,
      label: "Sieg",
    });
    expect(scoreFor("b", { outcome: "normal", winnerId: "a", games })).toEqual({
      self: 1,
      opponent: 2,
      label: "Niederlage",
    });
  });
  it("free win: Sieg for the winner, Niederlage for the other", () => {
    expect(
      scoreFor("a", { outcome: "free_win", winnerId: "a", games: [] }),
    ).toMatchObject({ label: "Sieg" });
    expect(
      scoreFor("b", { outcome: "free_win", winnerId: "a", games: [] }),
    ).toMatchObject({ label: "Niederlage" });
  });
  it("double loss is a Niederlage for both", () => {
    expect(
      scoreFor("a", { outcome: "double_loss", winnerId: null, games: [] }),
    ).toMatchObject({ label: "Niederlage" });
  });
});
