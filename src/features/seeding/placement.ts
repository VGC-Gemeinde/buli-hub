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
  prevDivision: string | null;
  prevPlacement: string | null;
  divisionId: string | null;
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

// Order for manual placement: returning players first (staff place them from
// their history), then new players by self-rating descending. Stable within
// each group. Auto-seeding by prior standings will replace this once it exists.
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
