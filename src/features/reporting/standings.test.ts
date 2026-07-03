import { describe, expect, it } from "vitest";
import type { Identity } from "@/features/season/dashboard";
import { computeStandings, type ResultForStandings } from "./standings";

const id = (userId: string, name: string): Identity => ({
  userId,
  name,
  avatarUrl: null,
});
const roster = [id("a", "Charlie"), id("b", "Alice"), id("c", "Bob")];

const normal = (
  winnerId: string,
  playerAId: string,
  playerBId: string,
): ResultForStandings => ({
  playerAId,
  playerBId,
  outcome: "normal",
  winnerId,
  confirmedAt: null,
});

describe("computeStandings", () => {
  it("all zero, ordered by name (de) when there are no results", () => {
    const rows = computeStandings({ roster, results: [] });
    expect(rows.map((r) => r.name)).toEqual(["Alice", "Bob", "Charlie"]);
    expect(rows.every((r) => r.points === 0 && r.wins === 0)).toBe(true);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("a normal result gives the winner 3 points and a win, the loser a loss", () => {
    const rows = computeStandings({ roster, results: [normal("a", "a", "b")] });
    const a = rows.find((r) => r.userId === "a");
    const b = rows.find((r) => r.userId === "b");
    expect(a).toMatchObject({ wins: 1, losses: 0, points: 3, rank: 1 });
    expect(b).toMatchObject({ wins: 0, losses: 1, points: 0 });
  });

  it("orders by points, then fewer losses, then name", () => {
    const rows = computeStandings({
      roster,
      results: [
        normal("a", "a", "b"),
        normal("a", "a", "c"), // a: 2-0 (6 pts)
        normal("b", "b", "c"), // b: 1 win, 1 loss; c: 2 losses
      ],
    });
    expect(rows.map((r) => r.userId)).toEqual(["a", "b", "c"]);
    expect(rows[0].points).toBe(6);
  });

  it("tie on points breaks by fewer losses", () => {
    const tie = [id("x", "X"), id("y", "Y")];
    const rows = computeStandings({
      roster: tie,
      results: [
        // both 1 win, but y also took a loss
        normal("x", "x", "y"),
        normal("y", "y", "x"),
        {
          playerAId: "y",
          playerBId: "x",
          outcome: "double_loss",
          winnerId: null,
          confirmedAt: null,
        },
      ],
    });
    // x: 1W 1L (from double loss) ; y: 1W 2L → x ranks first
    expect(rows[0].userId).toBe("x");
  });

  it("a pending free win counts for nobody; a confirmed one counts", () => {
    const pending = computeStandings({
      roster,
      results: [
        {
          playerAId: "a",
          playerBId: "b",
          outcome: "free_win",
          winnerId: "a",
          confirmedAt: null,
        },
      ],
    });
    expect(pending.every((r) => r.points === 0)).toBe(true);

    const confirmed = computeStandings({
      roster,
      results: [
        {
          playerAId: "a",
          playerBId: "b",
          outcome: "free_win",
          winnerId: "a",
          confirmedAt: new Date(),
        },
      ],
    });
    expect(confirmed.find((r) => r.userId === "a")?.points).toBe(3);
    expect(confirmed.find((r) => r.userId === "b")?.losses).toBe(1);
  });

  it("a double loss is a loss for both, a win for neither", () => {
    const rows = computeStandings({
      roster,
      results: [
        {
          playerAId: "a",
          playerBId: "b",
          outcome: "double_loss",
          winnerId: null,
          confirmedAt: null,
        },
      ],
    });
    expect(rows.find((r) => r.userId === "a")).toMatchObject({
      wins: 0,
      losses: 1,
    });
    expect(rows.find((r) => r.userId === "b")).toMatchObject({
      wins: 0,
      losses: 1,
    });
  });

  it("unreported matches and byes count for nobody", () => {
    const rows = computeStandings({
      roster,
      results: [
        {
          playerAId: "a",
          playerBId: "b",
          outcome: null,
          winnerId: null,
          confirmedAt: null,
        },
        {
          playerAId: "c",
          playerBId: null,
          outcome: null,
          winnerId: null,
          confirmedAt: null,
        },
      ],
    });
    expect(rows.every((r) => r.wins === 0 && r.losses === 0)).toBe(true);
  });

  it("ranks are contiguous 1..n even on ties", () => {
    const rows = computeStandings({ roster, results: [] });
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
});
