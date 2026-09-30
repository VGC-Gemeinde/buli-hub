import type { SeasonPhase } from "@/features/staff/season-phase";

/**
 * Why a staff cancel of a registration must be refused in this phase, or null
 * when it may proceed. Cancelling works from the open window until the
 * finalized seeding — while the window is open players can also withdraw
 * themselves, but staff need the same power (a banned player, a registration
 * that must go; docs/plans/banlist.md). From the finalized seeding onward
 * removal goes through the drop flow, which keeps the finalized structure
 * intact (finalizeSeeding stays one-way, see docs/plans/discord-membership.md).
 */
export function cancellationBlocked(phase: SeasonPhase): string | null {
  switch (phase) {
    case "not_started":
      return "Es gibt keine Anmeldung, die storniert werden könnte.";
    case "registration_open":
    case "registration_closed":
      return null;
    case "seeded":
      return "Die Einteilung ist bereits finalisiert. Entferne den Spieler stattdessen über einen Drop.";
    case "schedule_hidden":
      return "Der Spielplan ist bereits erstellt. Entferne den Spieler stattdessen über einen Drop.";
    case "regular_season":
      return "Die Saison läuft bereits. Entferne den Spieler stattdessen über einen Drop.";
  }
}
