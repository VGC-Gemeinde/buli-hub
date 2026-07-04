import { scoreFor } from "@/features/reporting/match-state";
import {
  divisionGroups,
  subDivisionResults,
} from "@/features/reporting/queries";
import type { MatchOutcome } from "@/features/reporting/report";
import {
  computeStandings,
  divisionStandings,
  type StandingsRow,
} from "@/features/reporting/standings";
import { currentMatchday, type Identity } from "@/features/season/dashboard";
import {
  matchdaysForWindow,
  subDivisionMatches,
} from "@/features/season/queries";
import { assignZones, type Zone } from "@/features/seeding/post-season";
import { divisionsWithGroupSizes } from "@/features/seeding/queries";
import {
  divisionName,
  subDivisionName,
  subDivisionShortName,
} from "@/features/seeding/seeding";
import { seasonName } from "@/features/staff/registration-window";

export type ZoneByUser = Map<string, Zone>;

// One match of the shown round, from the neutral (player A) perspective.
export type PublicMatch = {
  matchId: string;
  playerA: Identity;
  playerB: Identity | null; // null = bye („spielfrei")
  reported: boolean;
  pending: boolean; // free win awaiting staff confirmation
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
};

export type PublicGroup = {
  subDivisionId: string;
  name: string; // „Division 1a"
  shortName: string; // „1a"
  standings: StandingsRow[];
  zones: ZoneByUser | null; // set only in sub_division mode
  matches: PublicMatch[]; // the current round's matches
};

export type PublicDivision = {
  tier: number;
  name: string; // „Division 1"
  mode: "sub_division" | "division";
  divisionStandings: StandingsRow[] | null; // Gesamttabelle (division mode)
  divisionZones: ZoneByUser | null;
  divisionGroupLabels: Map<string, string> | null;
  groups: PublicGroup[];
};

export type PublicOverview = {
  seasonName: string;
  currentRound: number | null;
  totalRounds: number;
  divisions: PublicDivision[];
};

// Maps a division's post-season config to the counts `assignZones` expects.
function zoneCounts(config: {
  championshipPlayoffSlots: number;
  guaranteedPromotions: number;
  promotionPlayoffSlots: number;
  demotionPlayoffSlots: number;
  guaranteedDemotions: number;
}) {
  return {
    champion: config.championshipPlayoffSlots,
    promotions: config.guaranteedPromotions,
    promotionPlayoff: config.promotionPlayoffSlots,
    demotionPlayoff: config.demotionPlayoffSlots,
    demotions: config.guaranteedDemotions,
  };
}

function zoneMap(
  standings: StandingsRow[],
  counts: {
    champion: number;
    promotions: number;
    promotionPlayoff: number;
    demotionPlayoff: number;
    demotions: number;
  },
): ZoneByUser {
  const zones = assignZones({ rowCount: standings.length, ...counts });
  return new Map(standings.map((row, i) => [row.userId, zones[i]]));
}

// Everything the public overview needs for a running season: every division with
// its sub-division tables (+ the Gesamttabelle in division mode), post-season
// zones, and the current matchday's pairings/results per group.
export async function publicLeagueOverview(
  windowId: string,
  seasonNumber: number,
  today: string,
): Promise<PublicOverview> {
  const [configs, matchdays] = await Promise.all([
    divisionsWithGroupSizes(windowId),
    matchdaysForWindow(windowId),
  ]);
  const currentRound = currentMatchday(matchdays, today)?.round ?? null;

  const divisions = await Promise.all(
    [...configs]
      .sort((a, b) => a.tier - b.tier)
      .map((config) => buildDivision(config, currentRound)),
  );

  return {
    seasonName: seasonName(seasonNumber),
    currentRound,
    totalRounds: matchdays.length,
    divisions,
  };
}

async function buildDivision(
  config: Awaited<ReturnType<typeof divisionsWithGroupSizes>>[number],
  currentRound: number | null,
): Promise<PublicDivision> {
  const groups = await divisionGroups(config.id);
  const counts = zoneCounts(config);
  const mode = config.relevantTable;

  // Division mode: the merged table carries the zones and a group chip per row.
  const division = mode === "division" ? divisionStandings(groups) : null;
  const divisionZones = division ? zoneMap(division, counts) : null;
  const divisionGroupLabels = division
    ? new Map(
        groups.flatMap((group) =>
          group.roster.map(
            (member) =>
              [
                member.userId,
                subDivisionShortName(config.tier, group.position),
              ] as const,
          ),
        ),
      )
    : null;

  const publicGroups = await Promise.all(
    groups.map((group) =>
      buildGroup(config.tier, group, mode, counts, currentRound),
    ),
  );

  return {
    tier: config.tier,
    name: divisionName(config.tier),
    mode,
    divisionStandings: division,
    divisionZones,
    divisionGroupLabels,
    groups: publicGroups,
  };
}

async function buildGroup(
  tier: number,
  group: Awaited<ReturnType<typeof divisionGroups>>[number],
  mode: "sub_division" | "division",
  counts: ReturnType<typeof zoneCounts>,
  currentRound: number | null,
): Promise<PublicGroup> {
  const standings = computeStandings({
    roster: group.roster,
    results: group.results,
  });
  // Zones sit on the relevant table only: the group table in sub_division mode.
  const zones = mode === "sub_division" ? zoneMap(standings, counts) : null;

  const identityById = new Map(group.roster.map((m) => [m.userId, m]));
  const matches =
    currentRound === null
      ? []
      : await currentRoundMatches(
          group.subDivisionId,
          currentRound,
          identityById,
        );

  return {
    subDivisionId: group.subDivisionId,
    name: subDivisionName(tier, group.position),
    shortName: subDivisionShortName(tier, group.position),
    standings,
    zones,
    matches,
  };
}

async function currentRoundMatches(
  subDivisionId: string,
  round: number,
  identityById: Map<string, Identity>,
): Promise<PublicMatch[]> {
  const [matches, resultByMatch] = await Promise.all([
    subDivisionMatches(subDivisionId),
    subDivisionResults(subDivisionId),
  ]);
  const unknown = (id: string): Identity =>
    identityById.get(id) ?? { userId: id, name: "Unbekannt", avatarUrl: null };

  return matches
    .filter((match) => match.round === round)
    .map((match): PublicMatch => {
      const result = resultByMatch.get(match.id) ?? null;
      const pending =
        result?.outcome === "free_win" && result.confirmedAt === null;
      const reported = result !== null && !pending;
      let scoreA: number | null = null;
      let scoreB: number | null = null;
      if (reported && result) {
        const s = scoreFor(match.playerAId, {
          outcome: result.outcome as MatchOutcome,
          winnerId: result.winnerId,
          games: result.games,
        });
        scoreA = s.self;
        scoreB = s.opponent;
      }
      return {
        matchId: match.id,
        playerA: unknown(match.playerAId),
        playerB: match.playerBId ? unknown(match.playerBId) : null,
        reported,
        pending,
        scoreA,
        scoreB,
        winnerId: reported ? (result?.winnerId ?? null) : null,
      };
    });
}
