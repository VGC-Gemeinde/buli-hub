import { ActionLink, Button, EmptyStateCard, SectionHeader } from "buli-hub";

/* The one empty/edge-state card (DESIGN.md §2.8) — it replaced bare sentences
 * and the dashed-border special case. Tick M is orange when there is something
 * to do and neutral (`informational`) when the card is only reporting a state.
 * Ported from the dev/ui gallery's EmptyStateCard specimen. */

export function MitAktion() {
  return (
    <EmptyStateCard
      title="Noch nicht geöffnet"
      action={<Button>Mit Discord anmelden</Button>}
    >
      Die Anmeldung startet in Kürze — sie wird im Discord angekündigt. Sobald
      sie läuft, kannst du dich hier direkt für die kommende Saison eintragen.
    </EmptyStateCard>
  );
}

export function Informativ() {
  return (
    <EmptyStateCard title="Noch kein Ergebnis" informational>
      Sobald das Ergebnis gemeldet ist, erscheinen hier Spiele, Replays und
      Teamsheets.
    </EmptyStateCard>
  );
}

export function MitTextlink() {
  return (
    <EmptyStateCard
      title="Kein Spiel diese Woche"
      action={<ActionLink href="/spielplan">Zum Spielplan</ActionLink>}
      informational
    >
      Du hast an Spieltag 4 spielfrei. Dein nächstes Match wird am 02.02.2026
      freigeschaltet.
    </EmptyStateCard>
  );
}

export function ImAbschnitt() {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader tickColor="navy" meta="Nur für Staff sichtbar">
        Einsprüche
      </SectionHeader>
      <EmptyStateCard title="Keine offenen Einsprüche" informational>
        Alle gemeldeten Ergebnisse dieses Spieltags wurden von beiden Spielern
        bestätigt. Neue Einsprüche erscheinen hier, sobald sie eingehen.
      </EmptyStateCard>
    </div>
  );
}
