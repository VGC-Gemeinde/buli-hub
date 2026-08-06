import { z } from "zod";
import type {
  GameRow,
  MatchOutcome,
  ResultRow,
  StaffResultInput,
} from "./report";
import { toResultRows } from "./report";

// What a staff decision on an open dispute does. The point of this module is
// that the two halves of a decision — what happens to the result and what the
// dispute is recorded as — are derived together from one input, so „korrigiert"
// always means the result actually changed and „bestätigt" always means it did
// not.

export const NOTE_MAX = 2000;

// The decision as it arrives from the client. The `edit` payload is validated
// separately against `staffResultSchema`, which needs the match context.
export const disputeDecisionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("uphold") }),
  z.object({ kind: z.literal("edit"), report: z.unknown() }),
  z.object({ kind: z.literal("free_win"), winnerId: z.string().min(1) }),
  z.object({ kind: z.literal("double_loss") }),
  z.object({ kind: z.literal("reset") }),
]);

export type DisputeDecisionInput = z.infer<typeof disputeDecisionSchema>;
export type DisputeDecisionKind = DisputeDecisionInput["kind"];

// Not optional: a decision that nobody can explain is not a decision. Both
// players read this on the match page.
export const disputeNoteSchema = z
  .string()
  .trim()
  .min(1, "Bitte erkläre deine Entscheidung")
  .max(NOTE_MAX, "Die Begründung ist zu lang");

// The decision with its result payload validated: `edit` carries a parsed
// report, everything else carries only what the UI collected.
export type DisputeDecision =
  | { kind: "uphold" }
  | { kind: "edit"; report: StaffResultInput }
  | { kind: "free_win"; winnerId: string }
  | { kind: "double_loss" }
  | { kind: "reset" };

// What has to happen to `match_results` alongside resolving the dispute.
export type DisputeChange =
  | { kind: "keep" }
  | { kind: "confirm" }
  | { kind: "replace"; result: ResultRow; games: GameRow[] }
  | { kind: "delete" };

export type DisputedResult = {
  outcome: MatchOutcome;
  // A free win only counts once staff confirmed it.
  confirmed: boolean;
};

export function disputeChange(
  decision: DisputeDecision,
  current: DisputedResult,
  note: string,
): { resolution: "upheld" | "corrected"; change: DisputeChange } {
  switch (decision.kind) {
    case "uphold":
      return {
        resolution: "upheld",
        // Upholding a result means it counts. For a free win that is still
        // waiting on staff, that is exactly the confirmation — otherwise the
        // decision would leave the match in the queue it came from.
        change:
          current.outcome === "free_win" && !current.confirmed
            ? { kind: "confirm" }
            : { kind: "keep" },
      };
    case "edit":
      return {
        resolution: "corrected",
        change: { kind: "replace", ...toResultRows(decision.report) },
      };
    case "free_win":
      return {
        resolution: "corrected",
        change: {
          kind: "replace",
          result: {
            outcome: "free_win",
            winnerId: decision.winnerId,
            platform: null,
            playerATeamUrl: null,
            playerBTeamUrl: null,
            videoUrl: null,
            // The players see one explanation, not two: the decision note is
            // the free win's reason.
            freeWinReason: note,
            // Staff awards carry no „discussed with" — that is a player field.
            discussedWithId: null,
          },
          games: [],
        },
      };
    case "double_loss":
      return {
        resolution: "corrected",
        change: {
          kind: "replace",
          ...toResultRows({ outcome: "double_loss" }),
        },
      };
    case "reset":
      // The result is gone, the match is re-reportable — not upheld, so the
      // dispute is recorded as corrected and the note carries the detail.
      return { resolution: "corrected", change: { kind: "delete" } };
  }
}
