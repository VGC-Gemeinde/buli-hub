import { StatTile } from "buli-hub";

/* A number on the staff dashboard: the normal state of things, counted
 * instead of listed. `href` makes it a link (arrow in the corner); `alert`
 * turns it red only while the count is not zero; a zero is muted. Ported
 * from the dev/ui gallery's "Kacheln" specimen. */

export function DieseWoche() {
  return (
    <div className="grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile value={33} label="Offen" href="/staff/woche" />
      <StatTile value={35} sub="von 68" label="Gemeldet" />
      <StatTile value={0} label="Überfällig" alert />
      <StatTile value={1} label="Angefochten" alert href="/staff/woche" />
    </div>
  );
}

export function Saison() {
  return (
    <div className="grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile value={133} label="Spieler" href="/staff/teilnehmer" />
      <StatTile value={3} label="Drops" />
      <StatTile value={11} label="Nicht auf dem Server" />
      <StatTile value={1} sub="von 1" label="MotW bestätigt" />
    </div>
  );
}

export function Zustaende() {
  return (
    <div className="grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile value={12} label="Freewins" />
      <StatTile value={4} label="Aufnahmen" href="/staff/aufnahmen" />
      <StatTile value={0} label="Angefochten" alert />
      <StatTile value={2} label="Überfällig" alert href="/staff/woche" />
    </div>
  );
}
