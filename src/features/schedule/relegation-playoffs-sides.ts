// Who plays each Relegation and playoff match, for the staff workspaces that
// pick among them before the pairings are published (the Match of the Week).
// A side is settled once the match carries its player; until then it is the
// seat or origin with everyone who could hold it, read live from the
// standings (docs/plans/relegation-and-playoffs.md). Pure.

import { roundName } from "@/features/playoffs/bracket";
import {
  type PreviewMatch,
  type PreviewSide,
  previewMatches,
  type RelegationPlayoffsPreview,
  sideCandidates,
} from "./relegation-playoffs-preview";

export type ScheduledSide = {
  // "Division 2a · Platz 7", "Sieger HF 1"; null once the player is stored.
  label: string | null;
  // The stored player, or everyone who could hold the side. One id means
  // the side is settled.
  candidates: string[];
};

export type ScheduledMatchSides = {
  matchId: string;
  stage: "relegation" | "playoff";
  // The Relegation boundary's upper tier; 1 for the playoffs.
  tier: number;
  round: number;
  // "Relegation · Division 1 und 2", "Playoffs · Halbfinale".
  title: string;
  // "1", "HF 1", "Finale".
  label: string;
  a: ScheduledSide;
  b: ScheduledSide;
};

// A stored Relegation or playoff match.
export type ScheduledMatchRow = {
  matchId: string;
  stage: "relegation" | "playoff";
  tier: number;
  position: number;
  round: number;
  playerAId: string | null;
  playerBId: string | null;
};

function sideLabel(side: PreviewSide): string {
  return side.kind === "seat" ? side.seatLabel : side.label;
}

export function scheduledMatchSides(input: {
  rows: readonly ScheduledMatchRow[];
  preview: RelegationPlayoffsPreview;
  // The round of the first week after the regular season.
  firstRound: number;
}): ScheduledMatchSides[] {
  const all = previewMatches(input.preview);
  const boundaryName = new Map(
    input.preview.relegation.map((boundary) => [
      boundary.upperTier,
      boundary.name,
    ]),
  );
  const totalRounds = Array.isArray(input.preview.playoffs)
    ? input.preview.playoffs.length
    : 0;

  return input.rows.flatMap((row) => {
    const week = row.round - input.firstRound + 1;
    const match: PreviewMatch | undefined = all.find(
      (m) =>
        m.stage === row.stage &&
        m.tier === row.tier &&
        m.week === week &&
        m.position === row.position,
    );
    if (!match) {
      return [];
    }
    const side = (stored: string | null, preview: PreviewSide) =>
      stored !== null
        ? { label: null, candidates: [stored] }
        : {
            label: sideLabel(preview),
            candidates: sideCandidates(preview, all),
          };
    return [
      {
        matchId: row.matchId,
        stage: row.stage,
        tier: row.tier,
        round: row.round,
        title:
          row.stage === "relegation"
            ? `Relegation · ${boundaryName.get(row.tier) ?? ""}`
            : `Playoffs · ${roundName(totalRounds, week)}`,
        label: match.label,
        a: side(row.playerAId, match.a),
        b: side(row.playerBId, match.b),
      },
    ];
  });
}

// Whether a candidacy's line-up moved since it was nominated.
export function sidesChanged(
  nominated: { a: readonly string[]; b: readonly string[] },
  current: { a: ScheduledSide; b: ScheduledSide },
): boolean {
  const same = (x: readonly string[], y: readonly string[]) =>
    x.length === y.length &&
    [...x].sort().every((id, i) => id === [...y].sort()[i]);
  return !(
    same(nominated.a, current.a.candidates) &&
    same(nominated.b, current.b.candidates)
  );
}
