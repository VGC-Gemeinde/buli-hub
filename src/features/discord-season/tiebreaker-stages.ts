import type { FinalTable } from "@/features/final-table/places";
import type { Zone } from "@/features/seeding/post-season";
import type { StageRoom } from "./plan";

// The stage room a place in a zone leads into, if any.
function stageOfZone(zone: Zone): StageRoom | null {
  switch (zone) {
    case "champion":
      return "playoff";
    case "promotion_playoff":
    case "demotion_playoff":
      return "relegation";
    default:
      return null;
  }
}

// The stage rooms the players of an undecided tie at a zone boundary get in
// advance: the rooms of the stages their tie decides on, so they have a chat
// to sort the tie out in, next to the players they may meet afterwards. Every
// tie counts, a tiebreaker (two players) and a staff order (three or more)
// alike. Once the tie is decided the room follows the matches again: whoever
// takes the seat plays in the stage, the others leave the room on the next
// sync.
export function tiebreakerStages(
  tables: readonly FinalTable[],
): Map<string, StageRoom[]> {
  const byUser = new Map<string, Set<StageRoom>>();
  for (const table of tables) {
    for (const tie of table.ties) {
      const undecided = table.places[tie.indexes[0]]?.holder.kind === "tie";
      if (!undecided) {
        continue;
      }
      const stages = tie.zones
        .map(stageOfZone)
        .filter((stage): stage is StageRoom => stage !== null);
      for (const userId of tie.userIds) {
        const set = byUser.get(userId) ?? new Set<StageRoom>();
        for (const stage of stages) {
          set.add(stage);
        }
        if (set.size > 0) {
          byUser.set(userId, set);
        }
      }
    }
  }
  return new Map([...byUser].map(([userId, set]) => [userId, [...set]]));
}
