import { describe, expect, it } from "vitest";
import type { StaffMatchRow } from "./queries";
import { bucketMatches } from "./staff-dashboard";

const base: StaffMatchRow = {
  matchId: "m",
  round: 1,
  tier: 1,
  groupName: "Division 1a",
  endsOn: "2026-07-07",
  playerA: { userId: "a", name: "A", avatarUrl: null },
  playerB: { userId: "b", name: "B", avatarUrl: null },
  outcome: null,
  winnerId: null,
  confirmedAt: null,
  decidedByDrop: false,
  freeWinReason: null,
  reporterName: null,
  reportedAt: null,
  dispute: null,
};
const row = (o: Partial<StaffMatchRow>): StaffMatchRow => ({ ...base, ...o });
const today = "2026-07-10";

describe("bucketMatches", () => {
  it("overdue = unreported past its deadline", () => {
    const { overdue } = bucketMatches({
      matches: [
        row({ matchId: "past-open", endsOn: "2026-07-07" }),
        row({
          matchId: "past-done",
          endsOn: "2026-07-07",
          outcome: "normal",
          winnerId: "a",
        }),
        row({ matchId: "future-open", endsOn: "2026-07-21" }),
      ],
      currentRound: 2,
      today,
    });
    expect(overdue.map((m) => m.matchId)).toEqual(["past-open"]);
  });

  it("pendingFreeWins = free wins without a confirmation", () => {
    const { pendingFreeWins } = bucketMatches({
      matches: [
        row({
          matchId: "pending",
          outcome: "free_win",
          winnerId: "a",
          confirmedAt: null,
        }),
        row({
          matchId: "confirmed",
          outcome: "free_win",
          winnerId: "a",
          confirmedAt: new Date(),
        }),
        row({ matchId: "normal", outcome: "normal", winnerId: "a" }),
      ],
      currentRound: 1,
      today,
    });
    expect(pendingFreeWins.map((m) => m.matchId)).toEqual(["pending"]);
  });

  it("thisWeek = every match of the current round", () => {
    const { thisWeek } = bucketMatches({
      matches: [
        row({ matchId: "r2a", round: 2 }),
        row({ matchId: "r2b", round: 2, outcome: "normal", winnerId: "a" }),
        row({ matchId: "r3", round: 3 }),
      ],
      currentRound: 2,
      today,
    });
    expect(thisWeek.map((m) => m.matchId)).toEqual(["r2a", "r2b"]);
  });

  it("no current round → thisWeek is empty", () => {
    const { thisWeek } = bucketMatches({
      matches: [row({ round: 1 })],
      currentRound: null,
      today,
    });
    expect(thisWeek).toHaveLength(0);
  });

  it("disputed = matches with an open dispute", () => {
    const { disputed } = bucketMatches({
      matches: [
        row({
          matchId: "d1",
          outcome: "normal",
          winnerId: "a",
          dispute: {
            reason: "wrong score",
            openedByName: "B",
            openedAt: new Date(),
          },
        }),
        row({ matchId: "clean", outcome: "normal", winnerId: "a" }),
      ],
      currentRound: 2,
      today,
    });
    expect(disputed.map((m) => m.matchId)).toEqual(["d1"]);
  });
});
