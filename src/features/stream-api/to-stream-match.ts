import { roundName } from "@/features/playoffs/bracket";
import type { Platform } from "@/features/reporting/report";
import {
  divisionName,
  subDivisionName,
  subDivisionShortName,
} from "@/features/seeding/seeding";
import { signedStreamPhotoUrl } from "@/features/stream-photos/access";
import { playerName } from "@/lib/player-name";

// The stream API payload for one match (docs/plans/stream-api.md): what
// gemeinde-streams needs to show a played match in its Team-Detail overlay.
// Pure mapping from the joined rows; the queries feed it, the tests pin it.

export type Side = "a" | "b";

export type StreamPlayer = { id: string; name: string };

/**
 * A player's record in the running season: match wins and losses out of
 * `computeStandings`, the same tally the standings table and the MotW picker
 * show. Only the match detail carries it, see `toStreamMatch` below.
 */
export type StreamRecord = { wins: number; losses: number };

export type StreamRecords = { a: StreamRecord; b: StreamRecord };

/** A player without a standings row yet, and what the list entry passes. */
export const NO_RECORD: StreamRecord = { wins: 0, losses: 0 };

export type StreamStage = "regular" | "tiebreaker" | "relegation" | "playoff";

export type StreamMatch = {
  id: string;
  round: number;
  /**
   * What part of the season the match belongs to
   * (../../../docs/plans/relegation-and-playoffs.md). `regular` for the
   * Spieltage, the others after them.
   */
  stage: StreamStage;
  /** "Spieltag 3", or "Woche 1" for a week after the regular season. */
  weekName: string;
  /**
   * What the match is called where the stream names its round: the week
   * name for a regular match, the stage otherwise ("Relegation",
   * "Playoffs · Halbfinale", "Tiebreaker").
   */
  roundLabel: string;
  /**
   * The division the match counts for; for a Relegation match the upper
   * one, for the Playoffs Division 1.
   */
  division: { tier: number; name: string };
  /**
   * The group of a regular match; for the others what stands in its place:
   * the boundary of a Relegation match ("Division 1 und 2"), "Playoffs", the
   * table a tiebreaker decides.
   */
  group: { name: string; shortName: string };
  playerA: StreamPlayer;
  playerB: StreamPlayer;
  /** Winner of each game in game order. */
  games: Side[];
  platform: Platform;
  motw: boolean;
  /** Held for a staff recording: the result is not public yet. */
  recording: boolean;
  reportedAt: string;
};

export type StreamMatchDetail = Omit<StreamMatch, "playerA" | "playerB"> & {
  playerA: StreamPlayer & StreamPlayerImages & { record: StreamRecord };
  playerB: StreamPlayer & StreamPlayerImages & { record: StreamRecord };
  /** Open team sheets as Showdown text, one per side. */
  sheets: { a: string; b: string };
};

/**
 * What the stream shows next to a player. `photoUrl` is the picture the
 * player uploaded for exactly this purpose (docs/plans/stream-photos.md);
 * null means they have none and the overlay draws its placeholder.
 *
 * `avatarUrl` is the Discord avatar the hub shows on its own pages. It is
 * **never** delivered here any more and is always null: the two are separate
 * pictures for separate places. The key stays until gemeinde-streams reads
 * `photoUrl`, because its schema still requires it.
 */
export type StreamPlayerImages = {
  photoUrl: string | null;
  /** @deprecated always null, read `photoUrl` instead */
  avatarUrl: null;
};

export type ProfileRow = {
  displayName: string | null;
  username: string | null;
  streamPhotoPath: string | null;
};

export type MatchInput = {
  id: string;
  round: number;
  stage: StreamStage;
  weekName: string;
  roundLabel: string;
  tier: number;
  group: { name: string; shortName: string };
  playerAId: string;
  playerBId: string;
  playerA: ProfileRow | null;
  playerB: ProfileRow | null;
  platform: Platform | null;
  reportedAt: Date;
  motw: boolean;
  recording: boolean;
  games: { gameNumber: number; winnerId: string }[];
  sheets: { playerId: string; ots: string }[];
};

/**
 * The match as the stream shows it, or null when there is nothing to show: a
 * result without a platform or games (not a played best-of-3), a game whose
 * winner is neither participant, or a missing team sheet.
 */
export function toStreamMatchDetail(
  input: MatchInput,
  records: StreamRecords = { a: NO_RECORD, b: NO_RECORD },
): StreamMatchDetail | null {
  if (input.platform === null || input.games.length === 0) {
    return null;
  }
  const games: Side[] = [];
  for (const game of [...input.games].sort(
    (x, y) => x.gameNumber - y.gameNumber,
  )) {
    if (game.winnerId === input.playerAId) {
      games.push("a");
    } else if (game.winnerId === input.playerBId) {
      games.push("b");
    } else {
      return null;
    }
  }
  const sheetA = input.sheets.find((s) => s.playerId === input.playerAId);
  const sheetB = input.sheets.find((s) => s.playerId === input.playerBId);
  if (!sheetA || !sheetB) {
    return null;
  }
  return {
    id: input.id,
    round: input.round,
    stage: input.stage,
    weekName: input.weekName,
    roundLabel: input.roundLabel,
    division: { tier: input.tier, name: divisionName(input.tier) },
    group: input.group,
    playerA: {
      id: input.playerAId,
      name: playerName(input.playerA?.displayName, input.playerA?.username),
      photoUrl: signedStreamPhotoUrl(input.playerA?.streamPhotoPath ?? null),
      avatarUrl: null,
      record: records.a,
    },
    playerB: {
      id: input.playerBId,
      name: playerName(input.playerB?.displayName, input.playerB?.username),
      photoUrl: signedStreamPhotoUrl(input.playerB?.streamPhotoPath ?? null),
      avatarUrl: null,
      record: records.b,
    },
    games,
    platform: input.platform,
    motw: input.motw,
    recording: input.recording,
    reportedAt: input.reportedAt.toISOString(),
    sheets: { a: sheetA.ots, b: sheetB.ots },
  };
}

/**
 * The list entry: the detail without images, records and sheets. The list is
 * the match picker, which needs none of them, and computing the standings for
 * every match of the season would cost a table per call.
 */
export function toStreamMatch(input: MatchInput): StreamMatch | null {
  const detail = toStreamMatchDetail(input);
  if (!detail) {
    return null;
  }
  const { sheets: _sheets, playerA, playerB, ...rest } = detail;
  return {
    ...rest,
    playerA: { id: playerA.id, name: playerA.name },
    playerB: { id: playerB.id, name: playerB.name },
  };
}

/**
 * How the stream names a match: its week, its round label and what stands
 * in its group's place. Pure; the queries hand in the season's shape.
 */
export function streamNaming(input: {
  stage: StreamStage;
  round: number;
  // The match's division (a Relegation match's upper one).
  tier: number;
  // Regular: the match's group; tiebreaker: the table's group, null for a
  // division table. Unused otherwise.
  groupPosition: number | null;
  // The number of regular Spieltage: later rounds are weeks after them.
  regularRounds: number;
  // The Playoffs' rounds, ascending.
  playoffRounds: readonly number[];
}): {
  weekName: string;
  roundLabel: string;
  group: { name: string; shortName: string };
} {
  const weekName =
    input.stage === "regular"
      ? `Spieltag ${input.round}`
      : `Woche ${input.round - input.regularRounds}`;
  const table =
    input.groupPosition === null
      ? { name: divisionName(input.tier), shortName: String(input.tier) }
      : {
          name: subDivisionName(input.tier, input.groupPosition),
          shortName: subDivisionShortName(input.tier, input.groupPosition),
        };
  switch (input.stage) {
    case "regular":
      return { weekName, roundLabel: weekName, group: table };
    case "tiebreaker":
      return { weekName, roundLabel: "Tiebreaker", group: table };
    case "relegation":
      return {
        weekName,
        roundLabel: "Relegation",
        group: {
          name: `Division ${input.tier} und ${input.tier + 1}`,
          shortName: `${input.tier}/${input.tier + 1}`,
        },
      };
    case "playoff": {
      const total = input.playoffRounds.length;
      const index = input.playoffRounds.indexOf(input.round) + 1;
      return {
        weekName,
        roundLabel: `Playoffs · ${roundName(total, index)}`,
        group: { name: "Playoffs", shortName: "PO" },
      };
    }
  }
}

/**
 * A record carried on past the regular season: the regular tally plus every
 * tiebreaker, Relegation and playoff match the player finished before this
 * one, minus the results still withheld. A double loss is a loss for both.
 * Pure.
 */
export function recordAfterSeason(input: {
  userId: string;
  regular: StreamRecord;
  // The season's matches after the regular season with a counted result.
  earlier: readonly {
    matchId: string;
    round: number;
    playerAId: string;
    playerBId: string;
    winnerId: string | null;
  }[];
  beforeRound: number;
  excluded: ReadonlySet<string>;
}): StreamRecord {
  let { wins, losses } = input.regular;
  for (const match of input.earlier) {
    if (
      match.round >= input.beforeRound ||
      input.excluded.has(match.matchId) ||
      (match.playerAId !== input.userId && match.playerBId !== input.userId)
    ) {
      continue;
    }
    if (match.winnerId === input.userId) {
      wins++;
    } else {
      losses++;
    }
  }
  return { wins, losses };
}
