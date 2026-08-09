import type {
  Platform,
  PlayerStatus,
} from "@/features/registration/registration";

// A registered player as seen by the seeding tool: registration signals +
// stored identity + current division placement.
export type SeedingPlayer = {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  status: PlayerStatus;
  platform: Platform;
  participatedBefore: boolean | null;
  skillSelfRating: number | null;
  prevSeason: string | null;
  prevName: string | null;
  prevDivision: number | null;
  prevPlacement: number | null;
  greatestAchievements: string | null;
  divisionId: string | null;
  subDivisionId: string | null;
};

export type Caveat = { kind: "self_reported"; label: string };

// Things staff should double-check about a player's placement signals. For the
// first season the only computable one is self-reported (unverified) history;
// staleness/confirmed-vs-detected caveats arrive with recorded standings.
export function seedingCaveats(
  player: Pick<SeedingPlayer, "status" | "participatedBefore">,
): Caveat[] {
  const caveats: Caveat[] = [];
  if (player.status === "returning" && player.participatedBefore === true) {
    caveats.push({ kind: "self_reported", label: "Selbst angegeben" });
  }
  return caveats;
}

// A seeding is ready to finalize when every registered player sits in a
// sub-division (and there is at least one player).
export function seedingReadiness(
  players: readonly Pick<SeedingPlayer, "subDivisionId">[],
): { total: number; grouped: number; ready: boolean } {
  const total = players.length;
  const grouped = players.filter((p) => p.subDivisionId !== null).length;
  return { total, grouped, ready: total > 0 && grouped === total };
}

// The division count suggested from the registrations: the largest previous
// division any returning player reported (0 when nobody reported one). Used to
// prefill the divisions when the seeding is first set up.
export function suggestedDivisionCount(
  players: readonly Pick<SeedingPlayer, "prevDivision">[],
): number {
  let max = 0;
  for (const player of players) {
    if (player.prevDivision !== null && player.prevDivision > max) {
      max = player.prevDivision;
    }
  }
  return max;
}

// The automatic placement of returning players into the division they were in
// last season. Placement (relegation) is deliberately ignored — a player goes
// back into the same tier. Players whose previous division is outside
// 1..divisionCount (or who have none) are left unplaced.
export function autoDivisionPlacements(
  players: readonly Pick<SeedingPlayer, "userId" | "prevDivision">[],
  divisionCount: number,
): { userId: string; tier: number }[] {
  const placements: { userId: string; tier: number }[] = [];
  for (const player of players) {
    const tier = player.prevDivision;
    if (tier !== null && tier >= 1 && tier <= divisionCount) {
      placements.push({ userId: player.userId, tier });
    }
  }
  return placements;
}

// Order for manual placement: returning players first, then new players by
// self-rating descending. Stable within each group. Returning players are
// auto-placed into their previous division (`autoDivisionPlacements`), so the
// ones that surface first in "Nicht platziert" are exactly those the automatic
// step could not place — no previous division recorded, or one outside the
// season's tier range. They need a staff decision, so they belong at the top.
export function orderForPlacement<
  T extends Pick<SeedingPlayer, "status" | "skillSelfRating">,
>(players: readonly T[]): T[] {
  return [...players].sort((a, b) => {
    const aReturning = a.status === "returning" ? 0 : 1;
    const bReturning = b.status === "returning" ? 0 : 1;
    if (aReturning !== bReturning) {
      return aReturning - bReturning;
    }
    return (b.skillSelfRating ?? -1) - (a.skillSelfRating ?? -1);
  });
}
