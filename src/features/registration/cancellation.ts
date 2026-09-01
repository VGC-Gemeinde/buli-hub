import type { SeasonPhase } from "@/features/staff/season-phase";

/**
 * Why a staff cancel of a registration must be refused in this phase, or null
 * when it may proceed. Cancelling exists for the gap between Anmeldeschluss
 * and the finalized seeding — before it players withdraw themselves, after it
 * removal goes through the drop flow, which keeps the finalized structure
 * intact (finalizeSeeding stays one-way, see docs/plans/discord-membership.md).
 */
export function cancellationBlocked(phase: SeasonPhase): string | null {
  switch (phase) {
    case "not_started":
      return "Es gibt keine geschlossene Anmeldung, die storniert werden könnte.";
    case "registration_open":
      return "Solange die Anmeldung offen ist, ziehen Spieler ihre Anmeldung selbst zurück. Stornieren ist erst nach Anmeldeschluss möglich.";
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
