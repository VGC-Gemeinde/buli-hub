import { SeasonMessagePanel, SectionHeader } from "buli-hub";

/* The generic informational pre-season state (§4.7 `nicht_platziert`): the
 * dashboard has nothing personal to show and says why. Unlike its two siblings
 * the copy is passed in, so the same panel carries every „you are not in this
 * one" message — a closed registration, a season the viewer sat out, a season
 * that is already over. Always `informational` (neutral tick, no action):
 * there is nothing for the player to do here. */

export function AnmeldungGeschlossen() {
  return (
    <SeasonMessagePanel
      title="Die Anmeldung für Saison 9 ist geschlossen"
      body="Die Einteilung der Divisionen läuft — sobald sie steht, findest du hier deine Gruppe, deinen Spielplan und deine Tabelle. Für Saison 10 kannst du dich im Frühjahr wieder anmelden."
    />
  );
}

export function NichtPlatziert() {
  return (
    <SeasonMessagePanel
      title="Du bist in der laufenden Saison nicht dabei"
      body="Für Saison 9 liegt keine Einteilung für dich vor. Die öffentliche Liga-Übersicht kannst du trotzdem verfolgen — Tabellen, Spieltage und das Match of the Week sind für alle sichtbar."
    />
  );
}

/* In place on the dashboard: the panel replaces the whole Spielplan-und-Tabelle
 * block, so it sits directly under the section header it is answering, inside
 * the narrow `max-w-[640px]` shell /spieler uses for its non-in-season states.
 * Headings set only case, weight and tracking in this system — the page title
 * names its step of the type scale itself. */
export function ImDashboard() {
  return (
    <div className="flex flex-col">
      <div className="h-[3px] bg-brand-orange" />
      <div className="mx-auto w-full max-w-[640px] px-6 py-12">
        <h1 className="mb-9 text-[40px] text-brand-blue dark:text-white">
          Spieler-Dashboard
        </h1>
        <div className="flex flex-col gap-4">
          <SectionHeader meta="Saison 8">Dein Spielplan</SectionHeader>
          <SeasonMessagePanel
            title="Saison 8 ist abgeschlossen"
            body="Alle Spieltage sind gespielt und alle Ergebnisse bestätigt. Deine Platzierung und die Auf- und Abstiege findest du in der öffentlichen Liga-Übersicht."
          />
        </div>
      </div>
    </div>
  );
}
