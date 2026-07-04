import { describe, expect, it } from "vitest";
import type { Identity } from "@/features/season/dashboard";
import { computeStandings, type ResultForStandings } from "./standings";

const id = (userId: string, name: string): Identity => ({
  userId,
  name,
  avatarUrl: null,
});
const roster = [id("a", "Charlie"), id("b", "Alice"), id("c", "Bob")];

// A normal best-of-3 the winner took by the given game score (2:0 by default).
const normal = (
  winnerId: string,
  playerAId: string,
  playerBId: string,
  loserGameWins = 0,
): ResultForStandings => {
  const loserId = winnerId === playerAId ? playerBId : playerAId;
  return {
    playerAId,
    playerBId,
    outcome: "normal",
    winnerId,
    confirmedAt: null,
    games: [
      { winnerId },
      { winnerId },
      ...(loserGameWins > 0 ? [{ winnerId: loserId }] : []),
    ],
  };
};

// A normal match written winner-first, with an explicit loser game count — lets a
// test dial in an exact game tally for one player against throwaway opponents.
const match = (
  winnerId: string,
  loserId: string,
  loserGameWins: 0 | 1,
): ResultForStandings => normal(winnerId, winnerId, loserId, loserGameWins);

describe("computeStandings", () => {
  it("all zero, ordered by name (de) when there are no results", () => {
    const rows = computeStandings({ roster, results: [] });
    expect(rows.map((r) => r.name)).toEqual(["Alice", "Bob", "Charlie"]);
    expect(rows.every((r) => r.points === 0 && r.wins === 0)).toBe(true);
  });

  it("a normal result: winner 3 points + a win, loser a loss, games counted", () => {
    const rows = computeStandings({
      roster,
      results: [normal("a", "a", "b", 1)], // a wins 2:1
    });
    expect(rows.find((r) => r.userId === "a")).toMatchObject({
      wins: 1,
      losses: 0,
      points: 3,
      gamesWon: 2,
      gamesLost: 1,
      rank: 1,
    });
    expect(rows.find((r) => r.userId === "b")).toMatchObject({
      wins: 0,
      losses: 1,
      gamesWon: 1,
      gamesLost: 2,
    });
  });

  it("a pending free win counts for nobody; a confirmed one is a 2:0 default win", () => {
    const freeWin = (confirmedAt: Date | null): ResultForStandings => ({
      playerAId: "a",
      playerBId: "b",
      outcome: "free_win",
      winnerId: "a",
      confirmedAt,
      games: [],
    });

    const pending = computeStandings({ roster, results: [freeWin(null)] });
    expect(pending.every((r) => r.points === 0 && r.gamesWon === 0)).toBe(true);

    const confirmed = computeStandings({
      roster,
      results: [freeWin(new Date())],
    });
    expect(confirmed.find((r) => r.userId === "a")).toMatchObject({
      points: 3,
      gamesWon: 2,
      gamesLost: 0,
    });
    expect(confirmed.find((r) => r.userId === "b")).toMatchObject({
      losses: 1,
      gamesWon: 0,
      gamesLost: 2,
    });
  });

  it("a double loss is a 0:2 default loss for both, a win for neither", () => {
    const rows = computeStandings({
      roster,
      results: [
        {
          playerAId: "a",
          playerBId: "b",
          outcome: "double_loss",
          winnerId: null,
          confirmedAt: null,
          games: [],
        },
      ],
    });
    for (const userId of ["a", "b"]) {
      expect(rows.find((r) => r.userId === userId)).toMatchObject({
        wins: 0,
        losses: 1,
        gamesWon: 0,
        gamesLost: 2,
      });
    }
  });

  it("byes and unreported matches count for nobody", () => {
    const rows = computeStandings({
      roster,
      results: [
        {
          playerAId: "a",
          playerBId: "b",
          outcome: null,
          winnerId: null,
          confirmedAt: null,
          games: [],
        },
        {
          playerAId: "c",
          playerBId: null,
          outcome: null,
          winnerId: null,
          confirmedAt: null,
          games: [],
        },
      ],
    });
    expect(rows.every((r) => r.wins === 0 && r.gamesWon === 0)).toBe(true);
  });

  it("differential breaks a tie on match wins", () => {
    // Both x and y beat z, but x sweeps 2:0 (diff +2) and y grinds 2:1 (diff +1).
    const tie = [id("x", "X"), id("y", "Y"), id("z", "Z")];
    const rows = computeStandings({
      roster: tie,
      results: [normal("x", "x", "z"), normal("y", "y", "z", 1)],
    });
    expect(rows.map((r) => r.userId)).toEqual(["x", "y", "z"]);
    expect(rows[0]).toMatchObject({ gamesWon: 2, gamesLost: 0 });
    expect(rows[1]).toMatchObject({ gamesWon: 2, gamesLost: 1 });
  });

  it("game win rate breaks a tie on match wins and differential", () => {
    // p: 7:3 games (diff +4, rate .70); q: 6:2 (diff +4, rate .75). Same wins and
    // differential, so q's higher rate ranks first. Opponents are throwaways.
    const rows = computeStandings({
      roster: [id("p", "P"), id("q", "Q")],
      results: [
        match("p", "p1", 0), // 2:0
        match("p", "p2", 0), // 2:0
        match("p", "p3", 1), // 2:1
        match("p4", "p", 1), // p loses 1:2
        match("q", "q1", 0), // 2:0
        match("q", "q2", 0), // 2:0
        match("q", "q3", 0), // 2:0
        match("q4", "q", 0), // q loses 0:2
      ],
    });
    const p = rows.find((r) => r.userId === "p");
    const q = rows.find((r) => r.userId === "q");
    expect(p).toMatchObject({ wins: 3, gamesWon: 7, gamesLost: 3 });
    expect(q).toMatchObject({ wins: 3, gamesWon: 6, gamesLost: 2 });
    expect(rows.map((r) => r.userId)).toEqual(["q", "p"]);
  });

  it("differential outranks rate when the two conflict", () => {
    // x: 12:5 games (diff +7, rate .706); y: 10:4 (diff +6, rate .714). Rate would
    // favour y, but differential is checked first, so x ranks ahead.
    const rows = computeStandings({
      roster: [id("x", "X"), id("y", "Y")],
      results: [
        match("x", "x1", 0), // 2:0
        match("x", "x2", 0), // 2:0
        match("x", "x3", 0), // 2:0
        match("x", "x4", 0), // 2:0
        match("x", "x5", 1), // 2:1
        match("x6", "x", 1), // x loses 1:2
        match("x7", "x", 1), // x loses 1:2
        match("y", "y1", 0), // 2:0
        match("y", "y2", 0), // 2:0
        match("y", "y3", 0), // 2:0
        match("y", "y4", 0), // 2:0
        match("y", "y5", 0), // 2:0
        match("y6", "y", 0), // y loses 0:2
        match("y7", "y", 0), // y loses 0:2
      ],
    });
    const x = rows.find((r) => r.userId === "x");
    const y = rows.find((r) => r.userId === "y");
    expect(x).toMatchObject({ wins: 5, gamesWon: 12, gamesLost: 5 });
    expect(y).toMatchObject({ wins: 5, gamesWon: 10, gamesLost: 4 });
    expect(rows.map((r) => r.userId)).toEqual(["x", "y"]);
  });

  it("genuinely tied players share a rank and the next rank skips", () => {
    // a and b both go 2:0; c and d both go 0:2 → ranks 1, 1, 3, 3.
    const field = [id("a", "A"), id("b", "B"), id("c", "C"), id("d", "D")];
    const rows = computeStandings({
      roster: field,
      results: [normal("a", "a", "c"), normal("b", "b", "d")],
    });
    const rank = (u: string) => rows.find((r) => r.userId === u)?.rank;
    expect(rank("a")).toBe(1);
    expect(rank("b")).toBe(1);
    expect(rank("c")).toBe(3);
    expect(rank("d")).toBe(3);
  });

  it("ranks are contiguous from 1 when there are no ties", () => {
    const rows = computeStandings({
      roster,
      results: [
        normal("a", "a", "b"),
        normal("a", "a", "c"),
        normal("b", "b", "c"),
      ],
    });
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
});
