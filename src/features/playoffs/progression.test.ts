import { describe, expect, it } from "vitest";
import { finalTable, type TieDecision } from "@/features/final-table/places";
import { relegationPlayoffsPreview } from "@/features/schedule/relegation-playoffs-preview";
import {
  playerWrites,
  type ResolvedMatch,
  resolveRelegationPlayoffs,
  type StoredMatch,
} from "./progression";

const NONE = {
  champion: 0,
  promotions: 0,
  promotionPlayoff: 0,
  demotionPlayoff: 0,
  demotions: 0,
};

// Division 1: one table of six, four title seats (p1..p4) and one relegation
// seat (p6). Division 2: one table of three, one relegation seat (q1), with
// q1/q2 optionally tied for it.
function preview(decided: Map<string, TieDecision> = new Map(), tie = false) {
  return relegationPlayoffsPreview({
    tablesByTier: new Map([
      [
        1,
        [
          finalTable({
            tier: 1,
            subDivisionId: null,
            groupPosition: null,
            groupLot: null,
            rows: [1, 2, 3, 4, 5, 6].map((rank) => ({
              userId: `p${rank}`,
              rank,
              dropped: false,
              lot: 0,
            })),
            counts: { ...NONE, champion: 4, demotionPlayoff: 1 },
          }),
        ],
      ],
      [
        2,
        [
          finalTable(
            {
              tier: 2,
              subDivisionId: null,
              groupPosition: null,
              groupLot: null,
              rows: [
                { userId: "q1", rank: 1, dropped: false, lot: 0 },
                { userId: "q2", rank: tie ? 1 : 2, dropped: false, lot: 0 },
                { userId: "q3", rank: 3, dropped: false, lot: 0 },
              ],
              counts: { ...NONE, promotionPlayoff: 1 },
            },
            decided,
          ),
        ],
      ],
    ]),
    matchdays: [
      { startsOn: "2026-11-09", endsOn: "2026-11-15" },
      { startsOn: "2026-11-16", endsOn: "2026-11-22" },
    ],
  });
}

// The stored matches of that schedule: relegation 1/2, HF 1, HF 2, final.
function stored(
  results: Partial<Record<string, StoredMatch["result"]>> = {},
  players: Partial<Record<string, [string | null, string | null]>> = {},
): StoredMatch[] {
  const match = (
    matchId: string,
    stage: "relegation" | "playoff",
    position: number,
    round: number,
  ): StoredMatch => ({
    matchId,
    stage,
    tier: 1,
    position,
    round,
    playerAId: players[matchId]?.[0] ?? null,
    playerBId: players[matchId]?.[1] ?? null,
    result: results[matchId] ?? null,
  });
  return [
    match("rel", "relegation", 0, 10),
    match("hf1", "playoff", 0, 10),
    match("hf2", "playoff", 1, 10),
    match("final", "playoff", 0, 11),
  ];
}

const won = (winnerId: string) => ({
  outcome: "normal" as const,
  winnerId,
  confirmedAt: null,
});
const doubleLoss = {
  outcome: "double_loss" as const,
  winnerId: null,
  confirmedAt: null,
};

function resolve(
  matches: StoredMatch[],
  options: {
    decided?: Map<string, TieDecision>;
    tie?: boolean;
    lateDropped?: string[];
  } = {},
): Map<string, ResolvedMatch> {
  return new Map(
    resolveRelegationPlayoffs({
      preview: preview(options.decided, options.tie),
      matches,
      firstRound: 10,
      droppedIds: new Set(),
      lateDroppedIds: new Set(options.lateDropped ?? []),
    }).map((match) => [match.matchId, match]),
  );
}

const ids = (match: ResolvedMatch | undefined) =>
  [match?.a, match?.b].map((side) =>
    side?.kind === "player" ? side.userId : side?.kind,
  );

describe("resolveRelegationPlayoffs", () => {
  it("seats the first round from the table and leaves the final open", () => {
    const state = resolve(stored());
    expect(ids(state.get("hf1"))).toEqual(["p1", "p4"]);
    expect(ids(state.get("hf2"))).toEqual(["p2", "p3"]);
    expect(ids(state.get("final"))).toEqual(["open", "open"]);
    expect(ids(state.get("rel"))).toEqual(["p6", "q1"]);
  });

  it("moves each semi-final's winner into the final", () => {
    const state = resolve(stored({ hf1: won("p4"), hf2: won("p2") }));
    expect(ids(state.get("final"))).toEqual(["p4", "p2"]);
    expect(state.get("final")?.outcome).toEqual({ kind: "none" });
  });

  it("gives the final without a match to the winner of the other semi after a double loss", () => {
    const state = resolve(stored({ hf1: doubleLoss, hf2: won("p3") }));
    expect(ids(state.get("final"))).toEqual(["vacant", "p3"]);
    expect(state.get("final")?.outcome).toEqual({
      kind: "won",
      winnerId: "p3",
    });
  });

  it("has no champion after two double losses", () => {
    const state = resolve(stored({ hf1: doubleLoss, hf2: doubleLoss }));
    expect(state.get("final")?.outcome).toEqual({ kind: "double_loss" });
  });

  it("decides an unplayed match by a late drop", () => {
    const state = resolve(stored({ hf1: won("p1"), hf2: won("p2") }), {
      lateDropped: ["p1"],
    });
    expect(state.get("final")?.outcome).toEqual({
      kind: "won",
      winnerId: "p2",
    });
  });

  it("keeps the players a match was played by", () => {
    const state = resolve(stored({ rel: won("x") }, { rel: ["x", "y"] }));
    expect(ids(state.get("rel"))).toEqual(["x", "y"]);
  });

  it("waits for a tie and seats nobody on an empty seat", () => {
    expect(ids(resolve(stored(), { tie: true }).get("rel"))).toEqual([
      "p6",
      "open",
    ]);
    const vacant = resolve(stored(), {
      tie: true,
      decided: new Map([["division:2:0", "vacant"]]),
    }).get("rel");
    expect(ids(vacant)).toEqual(["p6", "vacant"]);
    expect(vacant?.outcome).toEqual({ kind: "won", winnerId: "p6" });
  });
});

describe("playerWrites", () => {
  it("writes the known players of every match without a result", () => {
    const state = resolveRelegationPlayoffs({
      preview: preview(),
      matches: stored({ hf1: won("p4") }),
      firstRound: 10,
      droppedIds: new Set(),
      lateDroppedIds: new Set(),
    });
    expect(playerWrites(state)).toEqual([
      { matchId: "rel", playerAId: "p6", playerBId: "q1" },
      { matchId: "hf2", playerAId: "p2", playerBId: "p3" },
      { matchId: "final", playerAId: "p4", playerBId: null },
    ]);
  });
});
