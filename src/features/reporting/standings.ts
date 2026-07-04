import type { Identity } from "@/features/season/dashboard";
import type { MatchOutcome } from "./report";

// Pure standings computation for a sub-division. Only finished results count;
// unreported matches, byes, and free wins still pending staff confirmation count
// for nobody. Players are ranked by match wins, then game differential, then game
// win rate — all opponent-independent, so the same order holds when comparing
// players from different (equal-size) sub-divisions later. Players who are equal
// on all three share a rank, and the next rank skips (…, 3, 3, 5, …); resolving a
// genuine dead heat is left to the postseason feature.

export type StandingsRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  wins: number;
  losses: number;
  points: number;
  gamesWon: number;
  gamesLost: number;
  rank: number;
};

export type ResultForStandings = {
  playerAId: string;
  playerBId: string | null; // null = bye
  outcome: MatchOutcome | null; // null = unreported
  winnerId: string | null;
  confirmedAt: Date | null; // free_win is pending until this is set
  // Per-game winners of a normal best-of-3; empty for free_win/double_loss,
  // whose scores are defaulted (2:0 / 0:2) rather than played out.
  games: readonly { winnerId: string }[];
};

// gamesWon / (gamesWon + gamesLost); 0 when no games have counted yet. Used only
// for sort ordering — genuine-tie detection compares the integer tallies.
function gameWinRate(row: { gamesWon: number; gamesLost: number }): number {
  const total = row.gamesWon + row.gamesLost;
  return total === 0 ? 0 : row.gamesWon / total;
}

// Two players place identically iff their match wins and game tallies all match;
// equal differential + equal rate forces equal gamesWon/gamesLost, so comparing
// the integers is exact (and avoids comparing the derived float rate).
function tiedForPlacement(a: StandingsRow, b: StandingsRow): boolean {
  return (
    a.wins === b.wins &&
    a.gamesWon === b.gamesWon &&
    a.gamesLost === b.gamesLost
  );
}

export function computeStandings(input: {
  roster: readonly Identity[];
  results: readonly ResultForStandings[];
}): StandingsRow[] {
  type Tally = {
    wins: number;
    losses: number;
    gamesWon: number;
    gamesLost: number;
  };
  const tally = new Map<string, Tally>();
  for (const member of input.roster) {
    tally.set(member.userId, { wins: 0, losses: 0, gamesWon: 0, gamesLost: 0 });
  }
  const bump = (id: string | null, key: keyof Tally, by = 1) => {
    const record = id ? tally.get(id) : undefined;
    if (record) {
      record[key] += by;
    }
  };

  for (const result of input.results) {
    if (result.playerBId === null) continue; // bye — no match
    if (result.outcome === null) continue; // unreported
    if (result.outcome === "free_win" && result.confirmedAt === null) continue; // pending

    const { winnerId, playerAId, playerBId } = result;

    if (result.outcome === "double_loss") {
      // Both forfeit: a match loss and a 0:2 default game loss each.
      bump(playerAId, "losses");
      bump(playerBId, "losses");
      bump(playerAId, "gamesLost", 2);
      bump(playerBId, "gamesLost", 2);
      continue;
    }

    const loserId =
      winnerId === playerAId
        ? playerBId
        : winnerId === playerBId
          ? playerAId
          : null;
    bump(winnerId, "wins");
    bump(loserId, "losses");

    if (result.outcome === "free_win") {
      // Walkover: awarded as a 2:0 default win, like a no-show.
      bump(winnerId, "gamesWon", 2);
      bump(loserId, "gamesLost", 2);
      continue;
    }

    // normal: count the actual per-game winners.
    for (const game of result.games) {
      const gameLoserId =
        game.winnerId === playerAId
          ? playerBId
          : game.winnerId === playerBId
            ? playerAId
            : null;
      bump(game.winnerId, "gamesWon");
      bump(gameLoserId, "gamesLost");
    }
  }

  const rows: StandingsRow[] = input.roster.map((member) => {
    const record = tally.get(member.userId) ?? {
      wins: 0,
      losses: 0,
      gamesWon: 0,
      gamesLost: 0,
    };
    return {
      userId: member.userId,
      name: member.name,
      avatarUrl: member.avatarUrl,
      wins: record.wins,
      losses: record.losses,
      points: record.wins * 3,
      gamesWon: record.gamesWon,
      gamesLost: record.gamesLost,
      rank: 0,
    };
  });
  rows.sort(
    (a, b) =>
      b.wins - a.wins ||
      b.gamesWon - b.gamesLost - (a.gamesWon - a.gamesLost) ||
      gameWinRate(b) - gameWinRate(a) ||
      a.name.localeCompare(b.name, "de"),
  );
  // Standard competition ranking: genuinely tied players share a rank, then the
  // next rank skips the gap. The alphabetical sort above only fixes display order
  // within a tie — it does not split the shared rank.
  let rank = 0;
  rows.forEach((row, i) => {
    if (i === 0 || !tiedForPlacement(rows[i - 1], row)) {
      rank = i + 1;
    }
    row.rank = rank;
  });
  return rows;
}
