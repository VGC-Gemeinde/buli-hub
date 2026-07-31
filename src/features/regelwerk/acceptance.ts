import type { SeasonPhase } from "@/features/staff/season-phase";

// Pure decisions about Regelwerk acceptance. No database, no request — the
// prompt a player sees and the lock on their actions are both derived here, so
// the two can never disagree about who has to accept.

/** What the player is shown about their outstanding acceptance. */
export type RegelwerkPrompt =
  /** Nothing to ask for: accepted, not registered, or no season yet. */
  | "none"
  /** Registered, season not started — an invitation, dismissible. */
  | "reminder"
  /** Season running — actions are locked until they confirm. */
  | "gate";

export type AcceptanceInput = {
  phase: SeasonPhase;
  isRegistered: boolean;
  hasAccepted: boolean;
};

export function regelwerkPrompt(input: AcceptanceInput): RegelwerkPrompt {
  // Nothing is owed by someone who already confirmed, or who never signed up:
  // an unregistered visitor meets the acceptance checkbox at registration
  // instead (design §3.2), so nagging them here would be asking twice.
  if (input.hasAccepted || !input.isRegistered) {
    return "none";
  }
  if (input.phase === "regular_season") {
    return "gate";
  }
  // „not_started" means this player registered for a season that has since been
  // replaced; there is nothing running to accept rules for.
  return input.phase === "not_started" ? "none" : "reminder";
}

/**
 * Whether a player action must be refused. Deliberately *not* the same
 * condition as the gate dialog: the dialog needs a registration to have
 * something to talk about, while the lock does not care — anyone reaching a
 * player action during the running season is a participant by construction
 * (the actions themselves check that the caller is in the match), and an
 * unaccepted one must be stopped whether or not the registration row is where
 * we expect it.
 */
export function actionsLocked(input: {
  phase: SeasonPhase;
  hasAccepted: boolean;
}): boolean {
  return input.phase === "regular_season" && !input.hasAccepted;
}

/** The refusal a locked action returns. Shown verbatim, so it says what to do. */
export const LOCKED_ERROR = "Bestätige zuerst das Regelwerk.";

/** Disabled-state copy for a control the lock covers. */
export const LOCKED_HINT = "Erst Regelwerk bestätigen";
