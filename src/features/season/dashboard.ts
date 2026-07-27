import type { RegistrationState } from "@/features/staff/registration-window";
import type { SeasonPhase } from "@/features/staff/season-phase";

// The player's Spieler-Dashboard adapts across the whole season lifecycle. This
// module is the pure logic behind it: which view to show, and how to shape a
// player's schedule. All dates are ISO day strings (YYYY-MM-DD) as stored in
// `matchdays`; lexical comparison of equal-length ISO dates is chronological.

// Which top-level view the dashboard renders. Derived, never stored.
export type DashboardState =
  | "coming_soon" // no registration open yet / between seasons
  | "register_cta" // registration open, player not registered
  | "registered_open" // registration open, registered — details, still editable
  | "registered_closed" // registration closed, registered — division step, locked
  | "not_registered_closed" // registration closed, never registered
  | "in_season" // regular season, player placed
  | "not_placed"; // regular season, player has no placement

export function dashboardState(input: {
  phase: SeasonPhase;
  registration: RegistrationState;
  hasRegistration: boolean;
  isPlaced: boolean;
}): DashboardState {
  if (input.phase === "regular_season") {
    return input.isPlaced ? "in_season" : "not_placed";
  }
  if (input.registration === "not_started") {
    return "coming_soon";
  }
  if (input.registration === "open") {
    return input.hasRegistration ? "registered_open" : "register_cta";
  }
  // Registration closed: seeding / division step, entries locked.
  return input.hasRegistration ? "registered_closed" : "not_registered_closed";
}

// Whether the dashboard shows the Teilnehmerfeld — the roster of registered
// players. It runs the whole pre-season stretch: from the moment registration
// opens until the season starts. Before that there is nothing to show; once the
// season runs, the group standings carry the same information better.
export function showsRoster(phase: SeasonPhase): boolean {
  return (
    phase === "registration_open" ||
    phase === "registration_closed" ||
    phase === "seeded"
  );
}

export type Identity = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

// A player's match on the schedule: the opponent (null = bye) and the matchday
// week it falls in. `matchId` links to the match's report screen.
export type PlayerMatch = {
  matchId: string;
  round: number;
  startsOn: string;
  endsOn: string;
  opponent: Identity | null;
};

export type MatchdayLite = { round: number; startsOn: string; endsOn: string };

// The other player in a match from `userId`'s point of view, or null for a bye
// (`playerBId` null).
export function opponentOf(
  match: { playerAId: string; playerBId: string | null },
  userId: string,
): string | null {
  if (match.playerBId === null) {
    return null;
  }
  return match.playerAId === userId ? match.playerBId : match.playerAId;
}

// The active matchday (today within its window), else the nearest upcoming one,
// else null once the last matchday has passed.
export function currentMatchday(
  matchdays: readonly MatchdayLite[],
  today: string,
): MatchdayLite | null {
  const sorted = [...matchdays].sort((a, b) => a.round - b.round);
  const active = sorted.find((m) => m.startsOn <= today && today <= m.endsOn);
  return active ?? sorted.find((m) => m.startsOn > today) ?? null;
}

// Splits a player's matches into the next one to play and the rest. „next" is
// the earliest match not already past (the current week, or the nearest
// upcoming); everything after it is „upcoming". Past matches are returned
// separately (not shown in v1, but useful once results land).
export function splitPlayerMatches(
  matches: readonly PlayerMatch[],
  today: string,
): { next: PlayerMatch | null; upcoming: PlayerMatch[]; past: PlayerMatch[] } {
  const sorted = [...matches].sort((a, b) => a.round - b.round);
  const past: PlayerMatch[] = [];
  const active: PlayerMatch[] = [];
  for (const match of sorted) {
    (match.endsOn < today ? past : active).push(match);
  }
  const [next = null, ...upcoming] = active;
  return { next, upcoming, past };
}

// Whole days from `today` to `dateStr` (both YYYY-MM-DD). 0 = due today,
// negative = overdue. UTC-based, matching the date-only storage.
export function daysUntil(dateStr: string, today: string): number {
  const to = Date.parse(`${dateStr}T00:00:00Z`);
  const from = Date.parse(`${today}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

// Assembles a player's schedule from raw sub-division matches: keeps only the
// player's own matches, resolves the opponent identity (null = bye) via the
// roster map, and attaches the matchday dates. Rounds without a matchday are
// skipped (should not happen for a consistent schedule).
export function buildPlayerMatches(input: {
  matches: readonly {
    id: string;
    round: number;
    playerAId: string;
    playerBId: string | null;
  }[];
  matchdaysByRound: ReadonlyMap<number, { startsOn: string; endsOn: string }>;
  rosterById: ReadonlyMap<string, Identity>;
  userId: string;
}): PlayerMatch[] {
  const result: PlayerMatch[] = [];
  for (const match of input.matches) {
    if (match.playerAId !== input.userId && match.playerBId !== input.userId) {
      continue;
    }
    const day = input.matchdaysByRound.get(match.round);
    if (!day) {
      continue;
    }
    const opponentId = opponentOf(match, input.userId);
    result.push({
      matchId: match.id,
      round: match.round,
      startsOn: day.startsOn,
      endsOn: day.endsOn,
      opponent: opponentId ? (input.rosterById.get(opponentId) ?? null) : null,
    });
  }
  return result.sort((a, b) => a.round - b.round);
}
