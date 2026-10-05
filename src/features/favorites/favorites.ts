// Pure rules for Favoriten (docs/plans/favorites.md): which matches and table
// rows the page shows for a user's favourites, the form strip, and the
// spoiler coupling of the current week. Everything here works on the public
// overview's projection (`publicLeagueOverview`), so drops, replacements and
// the result embargo arrive already applied and the numbers always agree
// with the public tables.

import type { PickablePlayer } from "@/components/player-picker";
import type {
  PublicDivision,
  PublicMatch,
} from "@/features/public-league/queries";
import { predecessorsOf } from "@/features/replacements/replacement";
import { rowScoreHidden } from "@/features/spoilers/spoilers";

// W = win, L = loss (walkover and drop loss included), "double_loss" = both
// lost, "offen" = a past Spieltag still without a result. The page draws them
// as ✓ / ✗ cells (DESIGN.md §8.12).
export type FormResult = "W" | "L" | "double_loss" | "offen";

export type FormCell = {
  round: number;
  matchId: string;
  result: FormResult;
  // What the spoiler rule of the match row needs, so the cell is covered
  // exactly when its row is.
  isMotw: boolean;
  playerIds: readonly [string, string];
};

// A group with the matches of the season in which a favourite plays, every
// round; the page picks one round at a time.
export type FavoriteGroup = {
  subDivisionId: string;
  name: string; // "Division 1a"
  tier: number;
  matches: PublicMatch[];
};

export type FavoritePlayer = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  tier: number;
  groupName: string; // "Division 1a"
  // From the table that decides the division (the Gesamttabelle in division
  // mode), so "Platz 3" means what it means on the overview.
  rank: number;
  wins: number;
  losses: number;
  dropped: boolean;
  form: FormCell[];
};

// The groups of the season with every match a favourite plays in. A duel of
// two favourites is one match, so it is listed once. Tier order, groups in
// their division's order.
export function favoriteGroups(
  divisions: readonly PublicDivision[],
  favoriteIds: ReadonlySet<string>,
): FavoriteGroup[] {
  return [...divisions]
    .sort((a, b) => a.tier - b.tier)
    .flatMap((division) =>
      division.groups.map((group) => ({
        subDivisionId: group.subDivisionId,
        name: group.name,
        tier: division.tier,
        matches: group.matches.filter(
          (m) =>
            favoriteIds.has(m.playerA.userId) ||
            (m.playerB !== null && favoriteIds.has(m.playerB.userId)),
        ),
      })),
    )
    .filter((group) => group.matches.length > 0);
}

// One Spieltag of those groups: the groups without a favourite's match that
// round drop out.
export function favoritesWeek(
  groups: readonly FavoriteGroup[],
  round: number,
): FavoriteGroup[] {
  return groups
    .map((group) => ({
      ...group,
      matches: group.matches.filter((m) => m.round === round),
    }))
    .filter((group) => group.matches.length > 0);
}

// A player's form up to the running Spieltag, oldest first. It counts what
// the public table counts: a replacement's slot carries the rounds before
// the entry as the predecessor's matches (drop losses), and a result under
// embargo is left out. Byes and future rounds have no cell; the running
// Spieltag has one once it has a result, an earlier one without a result is
// "offen". `currentRound` null means no Spieltag runs any more: every round
// counts and every missing result is overdue.
export function formCells(
  matches: readonly PublicMatch[],
  userId: string,
  predecessorIds: readonly string[],
  currentRound: number | null,
): FormCell[] {
  const ids = new Set([userId, ...predecessorIds]);
  const cells: FormCell[] = [];
  const sorted = [...matches].sort((a, b) => a.round - b.round);
  for (const m of sorted) {
    if (m.playerB === null || m.embargo !== null) {
      continue;
    }
    const a = m.playerA.userId;
    const b = m.playerB.userId;
    if (!ids.has(a) && !ids.has(b)) {
      continue;
    }
    if (currentRound !== null && m.round > currentRound) {
      continue;
    }
    const base = {
      round: m.round,
      matchId: m.matchId,
      isMotw: m.isMotw,
      playerIds: [a, b] as const,
    };
    if (!m.reported) {
      if (currentRound === null || m.round < currentRound) {
        cells.push({ ...base, result: "offen" });
      }
      continue;
    }
    const self = ids.has(a) ? a : b;
    const result: FormResult =
      m.winnerId === self ? "W" : m.winnerId === null ? "double_loss" : "L";
    cells.push({ ...base, result });
  }
  return cells;
}

// The rows of "Deine Spieler": every favourite with a row in a public table
// of the season. A favourite who is not placed, or whose slot was taken over
// by a replacement (they leave every table), has no row and is skipped; a
// dropped one keeps theirs with the Drop tag. Tier order, then place.
export function favoritesTable(
  divisions: readonly PublicDivision[],
  favoriteIds: ReadonlySet<string>,
  replacedBy: ReadonlyMap<string, string>,
  currentRound: number | null,
): FavoritePlayer[] {
  const rows: FavoritePlayer[] = [];
  for (const division of divisions) {
    const deciding = division.divisionStandings
      ? new Map(division.divisionStandings.map((r) => [r.userId, r]))
      : null;
    for (const group of division.groups) {
      for (const groupRow of group.standings) {
        if (!favoriteIds.has(groupRow.userId)) {
          continue;
        }
        const row = deciding?.get(groupRow.userId) ?? groupRow;
        rows.push({
          userId: row.userId,
          name: row.name,
          avatarUrl: row.avatarUrl,
          tier: division.tier,
          groupName: group.name,
          rank: row.rank,
          wins: row.wins,
          losses: row.losses,
          dropped: row.dropped === true,
          form: formCells(
            group.matches,
            row.userId,
            predecessorsOf(row.userId, replacedBy),
            currentRound,
          ),
        });
      }
    }
  }
  return rows.sort(
    (a, b) =>
      a.tier - b.tier || a.rank - b.rank || a.name.localeCompare(b.name, "de"),
  );
}

// The running Spieltag's form cell, if it has a result: the one result that
// Platz, Bilanz and the cell itself keep covered while its match row is.
export function currentWeekCell(
  player: Pick<FavoritePlayer, "form">,
  currentRound: number | null,
): FormCell | null {
  if (currentRound === null) {
    return null;
  }
  return (
    player.form.find(
      (cell) => cell.round === currentRound && cell.result !== "offen",
    ) ?? null
  );
}

// Whether a form cell is covered: by the match row's own rule, unless the
// viewer revealed that match (here or in the row above, one reveal state).
// Only the running Spieltag is ever covered; earlier results are open.
export function formCellCovered(
  cell: FormCell,
  context: {
    currentRound: number | null;
    meId: string;
    spoilersOff: boolean;
    revealed: ReadonlySet<string>;
  },
): boolean {
  if (cell.round !== context.currentRound || cell.result === "offen") {
    return false;
  }
  if (context.revealed.has(cell.matchId)) {
    return false;
  }
  return rowScoreHidden({
    reported: true,
    isMotw: cell.isMotw,
    embargoed: false,
    isMine: cell.playerIds.includes(context.meId),
    spoilersOff: context.spoilersOff,
  });
}

// Everyone who can be added: the players with a row in a public table of the
// season (dropped included, replaced players not: they have nothing to show),
// minus the viewer. Sorted by name for the search list.
export function favoriteCandidates(
  divisions: readonly PublicDivision[],
  usernames: ReadonlyMap<string, string | null>,
  viewerId: string,
): PickablePlayer[] {
  const byId = new Map<string, PickablePlayer>();
  for (const division of divisions) {
    for (const group of division.groups) {
      for (const row of group.standings) {
        if (row.userId === viewerId || byId.has(row.userId)) {
          continue;
        }
        byId.set(row.userId, {
          userId: row.userId,
          name: row.name,
          username: usernames.get(row.userId) ?? null,
          avatarUrl: row.avatarUrl,
        });
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

// The page keeps a favourite removed on it in view, greyed out, until the
// next load, so the list does not jump under the cursor and a second click
// restores it. When fresh data arrives (after adding someone), the removed
// players' rows and matches are carried over from what was on screen.
export function keepRemoved(
  next: { players: FavoritePlayer[]; groups: FavoriteGroup[] },
  previous: { players: FavoritePlayer[]; groups: FavoriteGroup[] },
  removedIds: ReadonlySet<string>,
): { players: FavoritePlayer[]; groups: FavoriteGroup[] } {
  const present = new Set(next.players.map((p) => p.userId));
  const kept = previous.players.filter(
    (p) => removedIds.has(p.userId) && !present.has(p.userId),
  );
  const players = [...next.players, ...kept].sort(
    (a, b) =>
      a.tier - b.tier || a.rank - b.rank || a.name.localeCompare(b.name, "de"),
  );

  const groups = next.groups.map((group) => ({
    ...group,
    matches: [...group.matches],
  }));
  for (const prevGroup of previous.groups) {
    const carried = prevGroup.matches.filter(
      (m) =>
        removedIds.has(m.playerA.userId) ||
        (m.playerB !== null && removedIds.has(m.playerB.userId)),
    );
    if (carried.length === 0) {
      continue;
    }
    let target = groups.find(
      (g) => g.subDivisionId === prevGroup.subDivisionId,
    );
    if (!target) {
      target = { ...prevGroup, matches: [] };
      groups.push(target);
    }
    const ids = new Set(target.matches.map((m) => m.matchId));
    for (const m of carried) {
      if (!ids.has(m.matchId)) {
        target.matches.push(m);
      }
    }
  }
  return {
    players,
    groups: groups.sort(
      (a, b) =>
        a.tier - b.tier ||
        a.name.localeCompare(b.name, "de", { numeric: true }),
    ),
  };
}

// Why a favourite cannot be set, or null when it can. The page and the
// profile only offer the button where it works; this is the server's check.
export function favoriteRefusal(input: {
  viewerId: string | null;
  playerId: string;
  playerExists: boolean;
}): string | null {
  if (input.viewerId === null) {
    return "Melde dich an, um Favoriten zu speichern.";
  }
  if (input.viewerId === input.playerId) {
    return "Dich selbst kannst du nicht favorisieren.";
  }
  if (!input.playerExists) {
    return "Diesen Spieler gibt es nicht.";
  }
  return null;
}
