import type { Identity } from "@/features/season/dashboard";
import type { MatchOutcome } from "./report";

// Pure standings computation for a sub-division. A win is worth 3 points; only
// finished results count. Unreported matches, byes, and free wins still pending
// staff confirmation count for nobody.

export type StandingsRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  wins: number;
  losses: number;
  points: number;
  rank: number;
};

export type ResultForStandings = {
  playerAId: string;
  playerBId: string | null; // null = bye
  outcome: MatchOutcome | null; // null = unreported
  winnerId: string | null;
  confirmedAt: Date | null; // free_win is pending until this is set
};

export function computeStandings(input: {
  roster: readonly Identity[];
  results: readonly ResultForStandings[];
}): StandingsRow[] {
  const tally = new Map<string, { wins: number; losses: number }>();
  for (const member of input.roster) {
    tally.set(member.userId, { wins: 0, losses: 0 });
  }
  const bump = (id: string | null, key: "wins" | "losses") => {
    const record = id ? tally.get(id) : undefined;
    if (record) {
      record[key]++;
    }
  };

  for (const result of input.results) {
    if (result.playerBId === null) continue; // bye — no match
    if (result.outcome === null) continue; // unreported
    if (result.outcome === "free_win" && result.confirmedAt === null) continue; // pending

    if (result.outcome === "double_loss") {
      bump(result.playerAId, "losses");
      bump(result.playerBId, "losses");
      continue;
    }

    // normal or confirmed free_win: winner gets the win, the other the loss.
    const { winnerId, playerAId, playerBId } = result;
    const loserId =
      winnerId === playerAId
        ? playerBId
        : winnerId === playerBId
          ? playerAId
          : null;
    bump(winnerId, "wins");
    bump(loserId, "losses");
  }

  const rows: StandingsRow[] = input.roster.map((member) => {
    const record = tally.get(member.userId) ?? { wins: 0, losses: 0 };
    return {
      userId: member.userId,
      name: member.name,
      avatarUrl: member.avatarUrl,
      wins: record.wins,
      losses: record.losses,
      points: record.wins * 3,
      rank: 0,
    };
  });
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      a.losses - b.losses ||
      a.name.localeCompare(b.name, "de"),
  );
  rows.forEach((row, i) => {
    row.rank = i + 1;
  });
  return rows;
}
