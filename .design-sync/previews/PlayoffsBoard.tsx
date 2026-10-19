import { PlayoffsBoard } from "buli-hub";
import { finalTable } from "@/features/final-table/places";
import {
  resolveRelegationPlayoffs,
  type StoredMatch,
} from "@/features/playoffs/progression";
import { publicCards } from "@/features/playoffs/public-view";
import { relegationPlayoffsPreview } from "@/features/schedule/relegation-playoffs-preview";
import type { Identity } from "@/features/season/dashboard";
import { AVATAR_URL } from "./_fixtures";

/* `/playoffs`: the Division-1 bracket after the regular season
 * (docs/plans/relegation-and-playoffs.md). Page title with the spoiler
 * switch, then the rounds side by side, each card joined to the match it
 * leads to. Built with the app's own pure pipeline, exactly as the dev/ui
 * gallery does: final tables -> relegationPlayoffsPreview ->
 * resolveRelegationPlayoffs -> publicCards. Only the stored results differ
 * between the cells.
 *
 * Spoiler protection is per browser: a played match the viewer is not in is
 * covered by a pill over its score column, and the name it sent on is shown
 * as "Sieger HF 1". The covered cell is the state the page loads in.
 */

const NAMES = [
  "Kaito",
  "Sirius",
  "Lumi",
  "Rocco",
  "Mareike",
  "Jonte",
  "Vivi",
  "Hendrik",
];
const identities = new Map<string, Identity>(
  NAMES.map((name, i) => [
    name,
    { userId: name, name, avatarUrl: i % 3 === 0 ? AVATAR_URL : null },
  ]),
);
const NO_ZONES = {
  champion: 0,
  promotions: 0,
  promotionPlayoff: 0,
  demotionPlayoff: 0,
  demotions: 0,
};
function table(
  position: number | null,
  names: string[],
  counts: Partial<typeof NO_ZONES>,
) {
  return finalTable({
    tier: 1,
    subDivisionId: position === null ? null : `1-${position}`,
    groupPosition: position,
    groupLot: position === null ? null : position / 10,
    rows: names.map((userId, i) => ({
      userId,
      rank: i + 1,
      dropped: false,
      lot: i / 10,
    })),
    counts: { ...NO_ZONES, ...counts },
  });
}
const MATCHDAYS = [
  { startsOn: "2026-11-09", endsOn: "2026-11-15" },
  { startsOn: "2026-11-16", endsOn: "2026-11-22" },
  { startsOn: "2026-11-23", endsOn: "2026-11-29" },
];

// Division 1 in two groups, the top two of each into the semi-finals.
const GROUPS = relegationPlayoffsPreview({
  tablesByTier: new Map([
    [
      1,
      [
        table(0, ["Kaito", "Sirius", "Lumi", "Rocco"], { champion: 2 }),
        table(1, ["Mareike", "Jonte", "Vivi", "Hendrik"], { champion: 2 }),
      ],
    ],
  ]),
  matchdays: MATCHDAYS.slice(0, 2),
});
// Division 1 by its Gesamttabelle with six playoff places: 1 and 2 get a bye.
const BYES = relegationPlayoffsPreview({
  tablesByTier: new Map([[1, [table(null, NAMES, { champion: 6 })]]]),
  matchdays: MATCHDAYS,
});

type Preview = typeof GROUPS;
// A played Bo3: the winner's two games, the loser's `lost` games.
type Played = { winner: string; loser: string; lost: 0 | 1 };

function cards(
  preview: Preview,
  played: (Played | null)[],
  viewer: string | null,
) {
  const matches = Array.isArray(preview.playoffs)
    ? preview.playoffs.flatMap((round) => round.matches)
    : [];
  const stored: StoredMatch[] = matches.map((match, i) => ({
    matchId: `po-${i}`,
    stage: match.stage,
    tier: match.tier,
    position: match.position,
    round: 10 + match.week - 1,
    playerAId: null,
    playerBId: null,
    result: played[i]
      ? {
          outcome: "normal",
          winnerId: played[i].winner,
          confirmedAt: new Date("2026-11-14T19:30:00Z"),
        }
      : null,
  }));
  const resolved = resolveRelegationPlayoffs({
    preview,
    matches: stored,
    firstRound: 10,
    droppedIds: new Set(),
    lateDroppedIds: new Set(),
  });
  return publicCards({
    resolved,
    results: new Map(
      stored.flatMap((match, i) => {
        const game = played[i];
        if (!match.result || !game) return [];
        const games = [
          { winnerId: game.winner },
          ...(game.lost ? [{ winnerId: game.loser }] : []),
          { winnerId: game.winner },
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

const TWO_WEEKS = [
  { name: "Woche 1", startsOn: "2026-11-09", endsOn: "2026-11-15" },
  { name: "Woche 2", startsOn: "2026-11-16", endsOn: "2026-11-22" },
];
const THREE_WEEKS = [
  ...TWO_WEEKS,
  { name: "Woche 3", startsOn: "2026-11-23", endsOn: "2026-11-29" },
];

const HF1: Played = { winner: "Kaito", loser: "Jonte", lost: 1 };
const HF2: Played = { winner: "Sirius", loser: "Mareike", lost: 0 };
const FINAL: Played = { winner: "Sirius", loser: "Kaito", lost: 1 };

/** One semi-final played and covered (the viewer plays neither), the other
 *  still open, the final waiting on both. */
export const EinHalbfinaleGespieltVerdeckt = () => (
  <PlayoffsBoard
    cards={cards(GROUPS, [HF1, null, null], null)}
    season="Saison 9"
    weeks={TWO_WEEKS}
    initialSpoilersOff={false}
  />
);

/** Both semi-finals played, spoiler protection off; the viewer (Sirius)
 *  plays the final, so it carries the orange "mine" border. */
export const FinaleOffenEigenesMatch = () => (
  <PlayoffsBoard
    cards={cards(GROUPS, [HF1, HF2, null], "Sirius")}
    season="Saison 9"
    weeks={TWO_WEEKS}
    initialSpoilersOff
  />
);

/** Everything played and revealed: the winner rails run through to the
 *  champion. */
export const MeisterSteht = () => (
  <PlayoffsBoard
    cards={cards(GROUPS, [HF1, HF2, FINAL], null)}
    season="Saison 9"
    weeks={TWO_WEEKS}
    initialSpoilersOff
  />
);

/** Gesamttabelle with six playoff places: a Viertelfinale where places 1 and 2
 *  have a bye (their slot stays empty), three rounds, nothing played yet. */
export const MitFreilosen = () => (
  <PlayoffsBoard
    cards={cards(BYES, [], null)}
    season="Saison 9"
    weeks={THREE_WEEKS}
    initialSpoilersOff={false}
  />
);
