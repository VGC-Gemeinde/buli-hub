import { PublicLeague } from "buli-hub";
import type { PublicCard } from "@/features/playoffs/public-view";
import type { PublicRelegationPlayoffs } from "@/features/playoffs/queries";
import type {
  PublicMatch,
  PublicOverview,
} from "@/features/public-league/queries";
import {
  asIdentity,
  DIVISION_STANDINGS,
  overviewWithoutMotw,
  PUBLIC_OVERVIEW,
  STANDINGS,
} from "./_fixtures";

/* The full public league page: MotW block, division switcher, standings table
 * and the current matchday's fixtures. `meId` highlights the viewer's own row
 * ("DU"); `favoriteIds` puts the star before followed players' names in the
 * tables and match rows. Wide by nature — cfg.overrides gives it
 * cardMode:"column" and a viewport at the component's own max-width (1040px +
 * gutters), below which the MotW block's player names wrap mid-word. */

/* The shared PUBLIC_OVERVIEW tags the Gesamttabelle 1a/1b by alternating row
 * index (so the viewer reads "1b" while playing in 1a), ships only group 1a
 * and gives the viewer a bye in the same Spieltag as their MotW. Local fix:
 * tags by real membership, a second group 1b, and no double booking. */
const IN_1A = new Set(STANDINGS.map((row) => row.userId));
const byId = (id: string) => DIVISION_STANDINGS.filter((r) => r.userId === id);
/* Grafaiai, Kilowattrel, Tinkatink (0:0 games) ahead of Maushold (0:2). */
const GROUP_1B = [
  ...byId("d").map((row) => ({ ...row, rank: 1 })),
  ...byId("e").map((row) => ({ ...row, rank: 1 })),
  ...byId("g").map((row) => ({ ...row, rank: 3 })),
  ...byId("f").map((row) => ({ ...row, rank: 4 })),
];
const open = (
  matchId: string,
  a: (typeof DIVISION_STANDINGS)[number],
  b: (typeof DIVISION_STANDINGS)[number],
): PublicMatch => ({
  matchId,
  round: 2,
  playerA: asIdentity(a),
  playerB: asIdentity(b),
  reported: false,
  pending: false,
  scoreA: null,
  scoreB: null,
  winnerId: null,
  isMotw: false,
  embargo: null,
});
const withGroups = (base: PublicOverview): PublicOverview => ({
  ...base,
  divisions: base.divisions.map((division) => ({
    ...division,
    divisionGroupLabels: new Map(
      DIVISION_STANDINGS.map((row) => [
        row.userId,
        IN_1A.has(row.userId) ? "1a" : "1b",
      ]),
    ),
    groups: [
      ...division.groups.map((group) => ({
        ...group,
        matches: group.matches.filter((match) => match.playerB !== null),
      })),
      {
        subDivisionId: "1b",
        name: "Division 1b",
        shortName: "1b",
        standings: GROUP_1B,
        zones: null,
        withheldResults: 0,
        matches: [
          open("pb1", GROUP_1B[0], GROUP_1B[1]),
          open("pb2", GROUP_1B[2], GROUP_1B[3]),
        ],
      },
    ],
  })),
});
const OVERVIEW = withGroups(PUBLIC_OVERVIEW);

/* The viewer follows Falinks and Grafaiai. */
const FAVORITES: ReadonlySet<string> = new Set(["a", "d"]);

export function LaufendeSaison() {
  return (
    <PublicLeague
      overview={OVERVIEW}
      meId="me"
      initialSpoilersOff={false}
      favoriteIds={FAVORITES}
    />
  );
}

export function OhneMatchOfTheWeek() {
  return (
    <PublicLeague
      overview={withGroups(overviewWithoutMotw())}
      meId="me"
      initialSpoilersOff={false}
      favoriteIds={FAVORITES}
    />
  );
}

/* After the regular season: the Spieltage are over, Woche 1 of Relegation und
 * Playoffs is running. Halbfinale 1 is played (covered by the spoiler switch),
 * Halbfinale 2 still open, the Finale waits for both winners; one Relegation
 * pairing against Division 2 runs in the same week. Hand-built PublicCards
 * (the real pure builders are value imports that reach the db layer). */
const card = (
  extra: Partial<PublicCard> & Pick<PublicCard, "matchId" | "label">,
): PublicCard => ({
  stage: "playoff",
  tier: 1,
  week: 1,
  position: 0,
  a: { kind: "vacant" },
  b: { kind: "vacant" },
  state: "open",
  scoreA: null,
  scoreB: null,
  winner: null,
  doubleLoss: false,
  mine: false,
  fromA: null,
  fromB: null,
  ...extra,
});

const player = (identity: ReturnType<typeof asIdentity>) => ({
  kind: "player" as const,
  identity,
  note: null,
});

const AFTER_SEASON: PublicRelegationPlayoffs = {
  cards: [
    card({
      matchId: "hf1",
      label: "HF 1",
      a: player(asIdentity(DIVISION_STANDINGS[0])),
      b: player(asIdentity(DIVISION_STANDINGS[3])),
      state: "played",
      scoreA: 2,
      scoreB: 1,
      winner: "a",
    }),
    card({
      matchId: "hf2",
      label: "HF 2",
      position: 1,
      a: player(asIdentity(STANDINGS[0])),
      b: player(asIdentity(DIVISION_STANDINGS[2])),
      mine: true,
    }),
    card({
      matchId: "fin",
      label: "Finale",
      week: 2,
      a: { kind: "placeholder", label: "Sieger HF 1", candidates: [] },
      b: { kind: "placeholder", label: "Sieger HF 2", candidates: [] },
      state: "waiting",
      fromA: "hf1",
      fromB: "hf2",
    }),
    card({
      matchId: "rel1",
      stage: "relegation",
      label: "1",
      a: player(asIdentity(DIVISION_STANDINGS[7])),
      b: player({ userId: "n", name: "Nacli", avatarUrl: null }),
    }),
  ],
  tiebreakers: [],
  tiebreakerTiers: new Map(),
  weeks: [
    {
      name: "Woche 1",
      startsOn: "2026-02-02",
      endsOn: "2026-02-08",
    },
    {
      name: "Woche 2",
      startsOn: "2026-02-09",
      endsOn: "2026-02-15",
    },
  ],
  completed: false,
};

export function NachDerSaison() {
  return (
    <PublicLeague
      overview={{ ...OVERVIEW, currentRound: null, motw: null }}
      meId="me"
      initialSpoilersOff={false}
      favoriteIds={FAVORITES}
      afterSeason={AFTER_SEASON}
      afterSeasonWeek={{ current: 1, show: 1, begun: 1 }}
    />
  );
}
