import { describe, expect, it } from "vitest";
import type { MatchResultLite } from "@/features/reporting/queries";
import type { PlayerMatch } from "@/features/season/dashboard";
import { profileScheduleRows } from "./profile";

const opponent = { userId: "opp", name: "Falinks", avatarUrl: null };
const match = (
  matchId: string,
  extra: Partial<PlayerMatch> = {},
): PlayerMatch => ({
  matchId,
  round: 1,
  startsOn: "2026-07-01",
  endsOn: "2026-07-07",
  opponent,
  ...extra,
});
const normalResult = (matchId: string): MatchResultLite => ({
  matchId,
  outcome: "normal",
  winnerId: "owner",
  confirmedAt: null,
  disputed: false,
  games: [{ winnerId: "owner" }, { winnerId: "opp" }, { winnerId: "owner" }],
});

describe("profileScheduleRows", () => {
  it("maps a reported match with the owner's score", () => {
    const [row] = profileScheduleRows({
      playerId: "owner",
      viewerId: null,
      matches: [match("m1")],
      resultByMatchId: new Map([["m1", normalResult("m1")]]),
      motwMatchIds: new Set(),
    });
    expect(row).toMatchObject({
      reported: true,
      scoreSelf: 2,
      scoreOpponent: 1,
      isMine: false,
      isMotw: false,
    });
  });

  it('keeps unreported and pending free-win matches "offen"', () => {
    const pending: MatchResultLite = {
      ...normalResult("m2"),
      outcome: "free_win",
      games: [],
    };
    const rows = profileScheduleRows({
      playerId: "owner",
      viewerId: null,
      matches: [match("m1"), match("m2", { round: 2 })],
      resultByMatchId: new Map([["m2", pending]]),
      motwMatchIds: new Set(),
    });
    expect(rows[0].reported).toBe(false);
    expect(rows[1].reported).toBe(false);
    expect(rows[1].scoreSelf).toBeNull();
  });

  it("marks the viewer's involvement — owner and opponent", () => {
    const asOwner = profileScheduleRows({
      playerId: "owner",
      viewerId: "owner",
      matches: [match("m1")],
      resultByMatchId: new Map(),
      motwMatchIds: new Set(),
    });
    expect(asOwner[0].isMine).toBe(true);
    const asOpponent = profileScheduleRows({
      playerId: "owner",
      viewerId: "opp",
      matches: [match("m1")],
      resultByMatchId: new Map(),
      motwMatchIds: new Set(),
    });
    expect(asOpponent[0].isMine).toBe(true);
    const asNeutral = profileScheduleRows({
      playerId: "owner",
      viewerId: "someone",
      matches: [match("m1")],
      resultByMatchId: new Map(),
      motwMatchIds: new Set(),
    });
    expect(asNeutral[0].isMine).toBe(false);
  });

  it("flags MotW matches and byes", () => {
    const rows = profileScheduleRows({
      playerId: "owner",
      viewerId: null,
      matches: [match("m1"), match("m2", { round: 2, opponent: null })],
      resultByMatchId: new Map([["m1", normalResult("m1")]]),
      motwMatchIds: new Set(["m1"]),
    });
    expect(rows[0].isMotw).toBe(true);
    expect(rows[1].opponent).toBeNull();
  });
});
