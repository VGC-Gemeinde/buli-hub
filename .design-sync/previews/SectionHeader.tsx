import { PlayerGrid, SectionHeader } from "buli-hub";
import { ROSTER } from "./_fixtures";

/* The one section header (DESIGN.md §2.3): Tick M + condensed uppercase h2 on a
 * bottom rule, with an optional count pill beside the title and optional meta
 * text pushed to the right. `tickColor="navy"` marks staff/officiating
 * sections. Ported from the dev/ui gallery's SectionHeader specimen. */

export function Varianten() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader meta="Division 1a">Tabelle</SectionHeader>
      <SectionHeader count={3}>Überfällig</SectionHeader>
      <SectionHeader tickColor="navy" meta="Nur für Staff sichtbar">
        Staff
      </SectionHeader>
      <SectionHeader tickColor="neutral" meta="Saison 1 · abgeschlossen">
        Archiv
      </SectionHeader>
    </div>
  );
}

export function ImAbschnitt() {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader count={4} meta="Anmeldung läuft bis 12.01.2026">
        Anmeldungen
      </SectionHeader>
      <PlayerGrid players={ROSTER} empty={null} />
    </div>
  );
}

export function LangerTitel() {
  return (
    <div className="max-w-md">
      <SectionHeader count={12} meta="Spieltag 2">
        Offene Partien der laufenden Woche
      </SectionHeader>
    </div>
  );
}
