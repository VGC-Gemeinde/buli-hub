import type { FinalTable } from "@/features/final-table/places";
import { motwForWindow } from "@/features/motw/queries";
import { holdsForWindow } from "@/features/recordings/queries";
import { resultsWithGames } from "@/features/reporting/queries";
import {
  regularSeasonClosed,
  seasonCompleted,
  tiebreakerRows,
} from "@/features/schedule/queries";
import { relegationPlayoffsWeekName } from "@/features/schedule/relegation-playoffs";
import { relegationPlayoffsResolved } from "@/features/schedule/relegation-playoffs-setup";
import { allMatchdaysForWindow } from "@/features/season/queries";
import { divisionName, subDivisionName } from "@/features/seeding/seeding";
import {
  type PublicCard,
  type PublicTiebreaker,
  publicCards,
  publicTiebreakers,
} from "./public-view";

export type PublicRelegationPlayoffs = {
  cards: PublicCard[];
  tiebreakers: PublicTiebreaker[];
  // Tiebreakers by the tier of the table they decide.
  tiebreakerTiers: Map<string, number>;
  weeks: { name: string; startsOn: string; endsOn: string }[];
  completed: boolean;
};

function tableName(table: FinalTable): string {
  return table.groupPosition === null
    ? divisionName(table.tier)
    : subDivisionName(table.tier, table.groupPosition);
}

// Relegation, Playoffs and tiebreakers for the public pages, cut to what
// this viewer may see (docs/plans/relegation-and-playoffs.md). Null until
// they are published.
export async function publicRelegationPlayoffs(
  windowId: string,
  viewer: { userId: string | null; isStaff: boolean },
): Promise<PublicRelegationPlayoffs | null> {
  if (!(await regularSeasonClosed(windowId))) {
    return null;
  }
  const [state, tiebreakers, holds, motw, matchdays, completed] =
    await Promise.all([
      relegationPlayoffsResolved(windowId),
      tiebreakerRows(windowId),
      holdsForWindow(windowId),
      motwForWindow(windowId),
      allMatchdaysForWindow(windowId),
      seasonCompleted(windowId),
    ]);
  if (!state) {
    return null;
  }
  const ids = [
    ...state.resolved.map((match) => match.matchId),
    ...tiebreakers.map((tiebreaker) => tiebreaker.matchId),
  ];
  const results = await resultsWithGames(ids);
  const withheld = new Set([
    ...holds.map((hold) => hold.matchId),
    ...motw
      .filter((selection) => selection.youtubeUrl === null)
      .map((selection) => selection.matchId),
  ]);
  const tables = [...state.tablesByTier.values()].flat();
  const publicTies = publicTiebreakers({
    tiebreakers,
    tables,
    tableName,
    results,
    withheld,
    identities: state.identities,
    viewer,
  });
  return {
    cards: publicCards({
      resolved: state.resolved,
      results,
      withheld,
      tiebreakerOf: new Map(tiebreakers.map((t) => [t.tieKey, t.matchId])),
      identities: state.identities,
      viewer,
    }),
    tiebreakers: publicTies,
    tiebreakerTiers: new Map(
      tiebreakers.flatMap((tiebreaker) => {
        const table = tables.find((t) =>
          t.ties.some((tie) => tie.key === tiebreaker.tieKey),
        );
        return table ? [[tiebreaker.matchId, table.tier] as const] : [];
      }),
    ),
    weeks: matchdays
      .filter((day) => !day.regular)
      .map((day, i) => ({
        name: relegationPlayoffsWeekName(i + 1),
        startsOn: day.startsOn,
        endsOn: day.endsOn,
      })),
    completed,
  };
}
