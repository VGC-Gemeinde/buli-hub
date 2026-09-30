// Pure rules of the Banliste (docs/plans/banlist.md). A ban keeps a Discord
// account out of future registrations; it never changes the current season
// by itself, which is why banning first surfaces the conflicts that the
// existing actions (cancel, drop, withdraw an offer) resolve.

import type { SeasonPhase } from "@/features/staff/season-phase";

/** What a banned player is told. The reason stays with staff. */
export const BAN_ERROR =
  "Du bist für die Anmeldung zur VGC Bundesliga gesperrt. Bei Fragen wende dich an den Staff.";

/** The refusal a registration path returns for a banned caller, or null. */
export function banBlock(banned: boolean): { ok: false; error: string } | null {
  return banned ? { ok: false, error: BAN_ERROR } : null;
}

// A Discord user id (snowflake): 17 to 20 digits. Accepts the id with
// surrounding whitespace or wrapped as a mention (<@123…>), which is how it
// usually gets copied out of Discord.
export function parseDiscordId(input: string): string | null {
  const trimmed = input.trim().replace(/^<@!?(\d+)>$/, "$1");
  return /^\d{17,20}$/.test(trimmed) ? trimmed : null;
}

// Something about the person in the current season that a ban leaves as it
// is. Each names the action that resolves it and where to find it.
export type BanConflict = {
  kind: "registration" | "placement" | "offer";
  text: string;
  actionLabel: string;
  href: string;
};

export function banConflicts(input: {
  userId: string;
  seasonName: string;
  phase: SeasonPhase;
  registered: boolean;
  // Placed in a group of the season and not dropped.
  playing: boolean;
  // A replacement offer to the person that has not been answered yet.
  pendingOfferFor: { userId: string; name: string } | null;
}): BanConflict[] {
  const conflicts: BanConflict[] = [];
  const preSeason =
    input.phase === "registration_open" ||
    input.phase === "registration_closed";
  if (input.registered && preSeason) {
    conflicts.push({
      kind: "registration",
      text: `Ist für ${input.seasonName} angemeldet.`,
      actionLabel: "Anmeldung stornieren",
      href: `/spieler/${input.userId}`,
    });
  }
  if (input.playing && !preSeason) {
    conflicts.push({
      kind: "placement",
      text: `Spielt in ${input.seasonName}.`,
      actionLabel: "Spieler droppen",
      href: `/spieler/${input.userId}`,
    });
  }
  if (input.pendingOfferFor) {
    conflicts.push({
      kind: "offer",
      text: `Hat ein offenes Angebot als Ersatz für ${input.pendingOfferFor.name}.`,
      actionLabel: "Angebot zurückziehen",
      href: `/spieler/${input.pendingOfferFor.userId}`,
    });
  }
  return conflicts;
}

// Why a ban cannot go through, or null when it may.
export function banGuard(input: {
  reason: string;
  alreadyBanned: boolean;
  self: boolean;
  conflicts: number;
  acknowledged: boolean;
}): string | null {
  if (input.self) {
    return "Du kannst dich nicht selbst bannen";
  }
  if (input.alreadyBanned) {
    return "Dieser Account ist bereits gebannt";
  }
  if (input.reason.trim() === "") {
    return "Bitte eine Begründung angeben";
  }
  if (input.conflicts > 0 && !input.acknowledged) {
    return "Löse die Konflikte in der laufenden Saison oder bestätige, dass du trotzdem bannen willst";
  }
  return null;
}
