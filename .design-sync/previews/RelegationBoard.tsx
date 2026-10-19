import { RelegationBoard } from "buli-hub";
import { finalTable } from "@/features/final-table/places";
import {
  resolveRelegationPlayoffs,
  type StoredMatch,
} from "@/features/playoffs/progression";
import { publicCards } from "@/features/playoffs/public-view";
import { relegationPlayoffsPreview } from "@/features/schedule/relegation-playoffs-preview";
import type { Identity } from "@/features/season/dashboard";
import { AVATAR_URL } from "./_fixtures";

/* `/relegation`: one card per division boundary, its pairings underneath
 * (docs/plans/relegation-and-playoffs.md). Upper division's player left, the
 * lower one's right, the score between them, and the outcome in two lines
 * underneath, whichever way it went: "steigt auf / steigt ab" when the lower
 * side wins, "bleibt" twice when the upper side holds. Under spoiler
 * protection both lines become two grey bars of fixed width, so the number of
 * lines never gives the result away.
 *
 * Built with the app's own pure pipeline (final tables ->
 * relegationPlayoffsPreview -> resolveRelegationPlayoffs -> publicCards), as
 * the dev/ui gallery does. Three divisions in two groups each, so there are
 * two boundaries with two pairings apiece.
 */

const avatars = new Set(["Kaito", "Ronja", "Lumi", "Theo"]);
function identity(name: string): Identity {
  return {
    userId: name,
    name,
    avatarUrl: avatars.has(name) ? AVATAR_URL : null,
  };
}
const NO_ZONES = {
  champion: 0,
  promotions: 0,
  promotionPlayoff: 0,
  demotionPlayoff: 0,
  demotions: 0,
};
function table(
  tier: number,
  position: number,
  names: string[],
  ranks: number[],
  counts: Partial<typeof NO_ZONES>,
) {
  return finalTable({
    tier,
    subDivisionId: `${tier}-${position}`,
    groupPosition: position,
    groupLot: position / 10,
    rows: names.map((userId, i) => ({
      userId,
      rank: ranks[i],
      dropped: false,
      lot: i / 10,
    })),
    counts: { ...NO_ZONES, ...counts },
  });
}
const MIDDLE = { promotionPlayoff: 1, demotionPlayoff: 1 };
const D1A = ["Kaito", "Sirius", "Lumi", "Rocco"];
const D1B = ["Mareike", "Jonte", "Vivi", "Hendrik"];
const D2A = ["Ronja", "Ilyas", "Nele", "Bastian"];
const D2B = ["Theo", "Pia", "Quentin", "Fenja"];
const D3A = ["Emil", "Lotte", "Cem", "Dana"];
const D3B = ["Mio", "Hanna", "Gil", "Jule"];
const NAMES = [...D1A, ...D1B, ...D2A, ...D2B, ...D3A, ...D3B];
const identities = new Map(NAMES.map((name) => [name, identity(name)]));
const LINEAR = [1, 2, 3, 4];

function preview(tieIn3b: boolean) {
  return relegationPlayoffsPreview({
    tablesByTier: new Map([
      [
        1,
        [
          table(1, 0, D1A, LINEAR, { demotionPlayoff: 1 }),
          table(1, 1, D1B, LINEAR, { demotionPlayoff: 1 }),
        ],
      ],
      [2, [table(2, 0, D2A, LINEAR, MIDDLE), table(2, 1, D2B, LINEAR, MIDDLE)]],
      [
        3,
        [
          table(3, 0, D3A, LINEAR, { promotionPlayoff: 1 }),
          // Mio and Hanna share Platz 1: the seat waits on a tiebreaker.
          table(3, 1, D3B, tieIn3b ? [1, 1, 3, 4] : LINEAR, {
            promotionPlayoff: 1,
          }),
        ],
      ],
    ]),
    matchdays: [{ startsOn: "2026-11-09", endsOn: "2026-11-15" }],
  });
}

const BOUNDARIES = [
  { tier: 1, name: "Division 1 und 2" },
  { tier: 2, name: "Division 2 und 3" },
];
const WEEKS = [
  {
    name: "Woche 1",
    startsOn: "2026-11-09",
    endsOn: "2026-11-15",
    content: "Relegation",
  },
];

// A result by match index: the winner, the score of a Bo3, or a double loss.
type Result =
  | { winner: string; loser: string; lost: 0 | 1 }
  | { doubleLoss: true };

function cards(
  tieIn3b: boolean,
  results: (Result | null)[],
  viewer: string | null,
) {
  const planned = preview(tieIn3b);
  const matches = planned.relegation.flatMap((boundary) => boundary.matches);
  const stored: StoredMatch[] = matches.map((match, i) => {
    const result = results[i] ?? null;
    return {
      matchId: `rel-${i}`,
      stage: match.stage,
      tier: match.tier,
      position: match.position,
      round: 10,
      playerAId: null,
      playerBId: null,
      result: result
        ? "doubleLoss" in result
          ? {
              outcome: "double_loss",
              winnerId: null,
              confirmedAt: new Date("2026-11-15T20:00:00Z"),
            }
          : {
              outcome: "normal",
              winnerId: result.winner,
              confirmedAt: new Date("2026-11-14T19:30:00Z"),
            }
        : null,
    };
  });
  return publicCards({
    resolved: resolveRelegationPlayoffs({
      preview: planned,
      matches: stored,
      firstRound: 10,
      droppedIds: new Set(),
      lateDroppedIds: new Set(),
    }),
    results: new Map(
      stored.flatMap((match, i) => {
        const result = results[i];
        if (!match.result || !result) return [];
        const games =
          "doubleLoss" in result
            ? []
            : [
                { winnerId: result.winner },
                ...(result.lost ? [{ winnerId: result.loser }] : []),
                { winnerId: result.winner },
              ];
        return [[match.matchId, { ...match.result, games }]];
      }),
    ),
    withheld: new Set(),
    tiebreakerOf: new Map(),
    identities,
    viewer: { userId: viewer, isStaff: false },
  });
}

// Pairings, in order: Rocco-Ronja, Hendrik-Theo (1|2), Bastian-Emil,
// Fenja-Mio (2|3). The played cells show the upper boundary only, so the
// whole board fits the card; the open cell shows both.
const UPPER = [BOUNDARIES[0]];

/** Both pairings at the upper boundary played, spoiler protection off: a
 *  promotion swap (Ronja up, Rocco down) and a double loss (DN). */
export const AlleGespieltAufgedeckt = () => (
  <RelegationBoard
    cards={cards(
      false,
      [{ winner: "Ronja", loser: "Rocco", lost: 1 }, { doubleLoss: true }],
      null,
    )}
    boundaries={UPPER}
    season="Saison 9"
    weeks={WEEKS}
    initialSpoilersOff
  />
);

/** Under spoiler protection: the pairing the viewer is not in is covered
 *  (pill over the score, two grey bars for the outcome); the viewer's own
 *  pairing (Hendrik, orange inset rail) stays visible and shows a held
 *  place. */
export const VerdecktMitEigenerPaarung = () => (
  <RelegationBoard
    cards={cards(
      false,
      [
        { winner: "Ronja", loser: "Rocco", lost: 1 },
        { winner: "Hendrik", loser: "Theo", lost: 0 },
      ],
      "Hendrik",
    )}
    boundaries={UPPER}
    season="Saison 9"
    weeks={WEEKS}
    initialSpoilersOff={false}
  />
);

/** Before anything is played, both boundaries: every pairing open, and a
 *  seat in Division 3b still waiting on the tiebreaker for the shared
 *  Platz 1. */
export const OffenSitzWartetAufTiebreaker = () => (
  <RelegationBoard
    cards={cards(true, [], null)}
    boundaries={BOUNDARIES}
    season="Saison 9"
    weeks={WEEKS}
    initialSpoilersOff={false}
  />
);
