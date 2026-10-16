import { describe, expect, it } from "vitest";
import { type FinalTable, finalTable } from "@/features/final-table/places";
import {
  previewMatches,
  relegationPlayoffsPreview,
  sideCandidates,
} from "./relegation-playoffs-preview";

const NONE = {
  champion: 0,
  promotions: 0,
  promotionPlayoff: 0,
  demotionPlayoff: 0,
  demotions: 0,
};

function group(
  tier: number,
  id: string,
  position: number,
  counts: Partial<typeof NONE>,
  ranks: number[] = [1, 2, 3, 4, 5, 6],
): FinalTable {
  return finalTable({
    tier,
    subDivisionId: id,
    groupPosition: position,
    groupLot: position / 10,
    rows: ranks.map((rank, i) => ({
      userId: `${id}${i + 1}`,
      rank,
      dropped: false,
      lot: 0,
    })),
    counts: { ...NONE, ...counts },
  });
}

const WEEKS = [
  { startsOn: "2026-11-09", endsOn: "2026-11-15" },
  { startsOn: "2026-11-16", endsOn: "2026-11-22" },
];

describe("relegationPlayoffsPreview", () => {
  it("shows relegation seats, the bracket and the weeks", () => {
    const preview = relegationPlayoffsPreview({
      tablesByTier: new Map([
        [
          1,
          [
            group(1, "a", 0, { champion: 2, demotionPlayoff: 1 }),
            group(1, "b", 1, { champion: 2, demotionPlayoff: 1 }),
          ],
        ],
        [
          2,
          [
            group(2, "c", 0, { promotionPlayoff: 1 }),
            group(2, "d", 1, { promotionPlayoff: 1 }),
          ],
        ],
      ]),
      matchdays: WEEKS,
    });

    expect(preview.weeks.map((week) => week.content)).toEqual([
      "Relegation · Halbfinale",
      "Finale",
    ]);
    expect(preview.relegation).toHaveLength(1);
    expect(preview.relegation[0].name).toBe("Division 1 und 2");
    expect(preview.relegation[0].matches[0]).toMatchObject({
      label: "1",
      a: {
        kind: "seat",
        seatLabel: "Division 1a · Platz 6",
        holder: { kind: "player", userId: "a6" },
      },
      b: {
        kind: "seat",
        seatLabel: "Division 2a · Platz 1",
        holder: { kind: "player", userId: "c1" },
      },
    });

    if (!Array.isArray(preview.playoffs)) throw new Error("no bracket");
    expect(preview.playoffs.map((round) => round.name)).toEqual([
      "Halbfinale",
      "Finale",
    ]);
    expect(preview.playoffs[1].matches[0]).toMatchObject({
      stage: "playoff",
      week: 2,
      position: 0,
      label: "Finale",
      a: { kind: "winner", label: "Sieger HF 1", week: 1, position: 0 },
      b: { kind: "winner", label: "Sieger HF 2", week: 1, position: 1 },
    });
    // The final's sides: whoever can win each semi.
    const all = previewMatches(preview);
    const final = preview.playoffs[1].matches[0];
    expect(sideCandidates(final.a, all)).toEqual(["a1", "b2"]);
    expect(sideCandidates(final.b, all)).toEqual(["a2", "b1"]);
  });

  it("lists byes and shows a bye seat directly in the second round", () => {
    const preview = relegationPlayoffsPreview({
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
              counts: { ...NONE, champion: 3 },
            }),
          ],
        ],
      ]),
      matchdays: WEEKS,
    });
    if (!Array.isArray(preview.playoffs)) throw new Error("no bracket");
    const [first, final] = preview.playoffs;
    expect(first.byes).toEqual([
      {
        kind: "seat",
        seatLabel: "Division 1 · Platz 1",
        holder: { kind: "player", userId: "p1" },
      },
    ]);
    expect(first.matches.map((m) => m.label)).toEqual(["HF 2"]);
    expect(final.matches[0].a).toMatchObject({
      seatLabel: "Division 1 · Platz 1",
    });
    expect(final.matches[0].b).toEqual({
      kind: "winner",
      label: "Sieger HF 2",
      week: 1,
      position: 1,
    });
  });

  it("lists boundary ties with their places and zones", () => {
    const preview = relegationPlayoffsPreview({
      tablesByTier: new Map([
        [1, [group(1, "a", 0, { champion: 2 }, [1, 2, 2, 4, 5, 6])]],
      ]),
      matchdays: WEEKS.slice(0, 1),
    });
    expect(preview.ties).toEqual([
      {
        key: "group:a:1",
        tableName: "Division 1a",
        placeLabel: "Platz 2 bis 3",
        zones: ["Playoffs", "Kein Auf- oder Abstieg"],
        userIds: ["a2", "a3"],
        decision: "tiebreaker",
      },
    ]);
  });

  it("has no bracket without title seats", () => {
    const preview = relegationPlayoffsPreview({
      tablesByTier: new Map([[1, [group(1, "a", 0, {})]]]),
      matchdays: WEEKS.slice(0, 1),
    });
    expect(preview.playoffs).toBeNull();
    expect(preview.weeks[0].content).toBe("Tiebreaker");
  });
});
