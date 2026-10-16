// What staff see of Relegation und Playoffs before they are published
// (docs/plans/relegation-and-playoffs.md): every pairing with its seats and
// who holds them right now, the bracket with where each side comes from, and
// the shared places that still need deciding. Pure: final tables in, view
// model out.

import {
  type BoundaryTie,
  type FinalTable,
  type Holder,
  type Seat,
  seatsOf,
} from "@/features/final-table/places";
import {
  bracketRounds,
  firstRoundSeeds,
  matchLabel,
  playoffMatches,
  roundName,
  roundSlots,
  seedPlayoffs,
  sideOrigin,
} from "@/features/playoffs/bracket";
import {
  boundaryName,
  relegationBoundaries,
} from "@/features/relegation/pairings";
import type { Zone } from "@/features/seeding/post-season";
import { divisionName, subDivisionName } from "@/features/seeding/seeding";

export type PreviewSide =
  // A seat of the table and who holds it ("Stand jetzt"); `tieKey` when the
  // seat is a place of a boundary tie.
  | { kind: "seat"; seatLabel: string; holder: Holder; tieKey?: string }
  // The winner of an earlier bracket match.
  | { kind: "winner"; label: string; week: number; position: number };

// One match of the schedule and its place: the Relegation boundary's upper
// tier, or 1 for the playoffs; `week` counts the weeks after the regular
// season; `position` is the match's index at its boundary or in its round.
export type PreviewMatch = {
  stage: "relegation" | "playoff";
  tier: number;
  week: number;
  position: number;
  label: string;
  a: PreviewSide;
  b: PreviewSide;
};

export type PreviewBoundary = {
  name: string;
  upperTier: number;
  matches: PreviewMatch[];
};

export type PreviewRound = {
  name: string;
  week: number;
  matches: PreviewMatch[];
  // Seeds that skip this round (first round only).
  byes: PreviewSide[];
};

export type PreviewTie = {
  key: string;
  tableName: string;
  placeLabel: string;
  zones: string[];
  userIds: string[];
  decision: BoundaryTie["decision"];
};

export type PreviewWeek = {
  week: number;
  startsOn: string;
  endsOn: string;
  content: string;
};

export type RelegationPlayoffsPreview = {
  weeks: PreviewWeek[];
  ties: PreviewTie[];
  relegation: PreviewBoundary[];
  // Null without title seats; "unseparable" when no first round keeps the
  // groups apart.
  playoffs: PreviewRound[] | "unseparable" | null;
};

export const ZONE_LABEL: Record<Zone, string> = {
  champion: "Playoffs",
  promote: "Direkter Aufstieg",
  promotion_playoff: "Relegation",
  demotion_playoff: "Relegation",
  demote: "Direkter Abstieg",
  none: "Kein Auf- oder Abstieg",
};

function tableName(table: {
  tier: number;
  groupPosition: number | null;
}): string {
  return table.groupPosition === null
    ? divisionName(table.tier)
    : subDivisionName(table.tier, table.groupPosition);
}

// "Division 2a · Platz 7".
export function seatLabel(seat: Seat): string {
  return `${tableName(seat)} · Platz ${seat.index + 1}`;
}

function seatSide(seat: Seat): PreviewSide {
  return {
    kind: "seat",
    seatLabel: seatLabel(seat),
    holder: seat.holder,
    ...(seat.tieKey ? { tieKey: seat.tieKey } : {}),
  };
}

function placeLabel(indexes: readonly number[]): string {
  const first = indexes[0] + 1;
  const last = indexes[indexes.length - 1] + 1;
  return first === last ? `Platz ${first}` : `Platz ${first} bis ${last}`;
}

// The ties at zone boundaries, every division top to bottom; each zone
// boundary it straddles named once.
function previewTies(
  tablesByTier: ReadonlyMap<number, readonly FinalTable[]>,
): PreviewTie[] {
  return [...tablesByTier.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([, tables]) => tables.flatMap((table) => table.ties))
    .map((tie) => ({
      key: tie.key,
      tableName: tableName(tie),
      placeLabel: placeLabel(tie.indexes),
      zones: [...new Set(tie.zones.map((zone) => ZONE_LABEL[zone]))],
      userIds: tie.userIds,
      decision: tie.decision,
    }));
}

function playoffRounds(
  tables: readonly FinalTable[],
): PreviewRound[] | "unseparable" | null {
  const seats = seatsOf(tables, "champion");
  const n = seats.length;
  if (n < 2) {
    return null;
  }
  const seeds = seedPlayoffs(seats);
  if (seeds === null) {
    return "unseparable";
  }
  const total = bracketRounds(n);
  const side = (round: number, position: number, which: 0 | 1) => {
    const origin = sideOrigin(n, round, position, which);
    return origin.kind === "seed"
      ? seatSide(seeds[origin.seed - 1])
      : ({
          kind: "winner",
          label: `Sieger ${matchLabel(total, origin.round, origin.position)}`,
          week: origin.round,
          position: origin.position,
        } as const);
  };
  const played = playoffMatches(n);
  return Array.from({ length: total }, (_, i) => {
    const round = i + 1;
    const byes: PreviewSide[] = [];
    if (round === 1) {
      for (let position = 0; position < roundSlots(n, 1); position++) {
        const [a, b] = firstRoundSeeds(n, position);
        if (a > n || b > n) {
          byes.push(seatSide(seeds[Math.min(a, b) - 1]));
        }
      }
    }
    return {
      name: roundName(total, round),
      week: round,
      matches: played
        .filter((match) => match.round === round)
        .map(({ position }) => ({
          stage: "playoff" as const,
          tier: 1,
          week: round,
          position,
          label: matchLabel(total, round, position),
          a: side(round, position, 0),
          b: side(round, position, 1),
        })),
      byes,
    };
  });
}

// The weeks with what is played in them: "Relegation · Viertelfinale",
// "Halbfinale", "Finale".
function previewWeeks(
  matchdays: readonly { startsOn: string; endsOn: string }[],
  relegation: boolean,
  playoffs: PreviewRound[] | "unseparable" | null,
): PreviewWeek[] {
  return matchdays.map((matchday, i) => {
    const week = i + 1;
    const round = Array.isArray(playoffs)
      ? playoffs.find((r) => r.week === week)
      : undefined;
    const parts = [
      ...(week === 1 && relegation ? ["Relegation"] : []),
      ...(round ? [round.name] : []),
    ];
    return {
      week,
      startsOn: matchday.startsOn,
      endsOn: matchday.endsOn,
      content: parts.length > 0 ? parts.join(" · ") : "Tiebreaker",
    };
  });
}

export function relegationPlayoffsPreview(input: {
  tablesByTier: ReadonlyMap<number, readonly FinalTable[]>;
  // The weeks after the regular season, in order.
  matchdays: readonly { startsOn: string; endsOn: string }[];
}): RelegationPlayoffsPreview {
  const relegation = relegationBoundaries(input.tablesByTier).map(
    (boundary) => ({
      name: boundaryName(boundary.upperTier, boundary.lowerTier),
      upperTier: boundary.upperTier,
      matches: boundary.pairings.map((pairing) => ({
        stage: "relegation" as const,
        tier: boundary.upperTier,
        week: 1,
        position: pairing.position,
        label: String(pairing.position + 1),
        a: seatSide(pairing.upper),
        b: seatSide(pairing.lower),
      })),
    }),
  );
  const topTier = Math.min(...input.tablesByTier.keys());
  const playoffs = playoffRounds(input.tablesByTier.get(topTier) ?? []);
  return {
    weeks: previewWeeks(input.matchdays, relegation.length > 0, playoffs),
    ties: previewTies(input.tablesByTier),
    relegation,
    playoffs,
  };
}

// Every match of the preview, Relegation first, then the bracket in round
// order.
export function previewMatches(
  preview: RelegationPlayoffsPreview,
): PreviewMatch[] {
  return [
    ...preview.relegation.flatMap((boundary) => boundary.matches),
    ...(Array.isArray(preview.playoffs)
      ? preview.playoffs.flatMap((round) => round.matches)
      : []),
  ];
}

// Who could hold a side: the seat's player, the candidates of an undecided
// shared place, or everyone who could win the earlier match it comes from.
// Sorted, so two snapshots compare by value.
export function sideCandidates(
  side: PreviewSide,
  matches: readonly PreviewMatch[],
): string[] {
  if (side.kind === "seat") {
    return side.holder.kind === "player"
      ? [side.holder.userId]
      : side.holder.kind === "vacant"
        ? []
        : [...side.holder.candidates].sort();
  }
  const from = matches.find(
    (match) =>
      match.stage === "playoff" &&
      match.week === side.week &&
      match.position === side.position,
  );
  if (!from) {
    return [];
  }
  return [
    ...sideCandidates(from.a, matches),
    ...sideCandidates(from.b, matches),
  ].sort();
}
