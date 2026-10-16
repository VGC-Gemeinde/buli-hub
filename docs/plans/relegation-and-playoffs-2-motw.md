# Relegation und Playoffs 2: Match of the Week in den neuen Wochen

**Status: done** (2026-10-11). Slice 2 von [[relegation-and-playoffs]].

Sobald der Spielplan für Relegation und Playoffs erstellt ist, erscheinen
seine Wochen im Match-of-the-Week-Workspace wie weitere Spieltage, und ihre
Matches lassen sich im gewohnten Ablauf als Kandidaten wählen, auch bevor
feststeht, wer sie spielt.

## Scope

**In:**

- `/staff/motw` und alle MotW-Gates rechnen mit allen Wochen
  (`allMatchdaysForWindow`): aktuelle Woche, wählbare Runden, Kandidaten-Gate.
  Ebenso der Drop (entfernt MotW-Bestätigungen künftiger Wochen) und das
  Aufnahme-Gate. Wochen heißen "Spieltag 7" bzw. "Woche 1"; der Pager zeigt
  "7" bzw. "W1" (`weekNames`, optionale Namen im `StaffWeekPager`).
- Optionen der neuen Wochen (`relegationPlayoffsOptions`): eine Seite ist ein
  Spieler, sobald das Match ihn trägt; bis dahin offen, mit Sitz oder Herkunft
  ("Division 2a · Platz 7", "Sieger HF 1") und allen, die ihn gerade halten
  könnten ("Alice oder Bob"). Gestrichelter Kreis statt Avatar, keine
  Formzeile. Recordability "unklar", Rangsortierung ans Ende.
- Ein Match mit offener Seite lässt sich nominieren, aber nicht bestätigen
  (Aktion und UI) und hat noch keinen Link auf eine Match-Seite.
  `matchSelectionContext` liest Matches jeder Art; nur ein reguläres Match
  ohne Spieler B ist ein Spielfrei.
- Schnappschuss: `recording_holds.nominated_sides` (jsonb, pro Seite die
  möglichen Spieler) bei jeder Nominierung eines Relegations- oder
  Playoff-Matches. Weicht die aktuelle Besetzung ab, zeigt die Kandidatenkarte
  "Besetzung geändert. Bei der Nominierung: …" mit "Neue Besetzung
  übernehmen" (nominiert in derselben Rolle neu), und `/staff` hat das Todo
  "Besetzung eines MotW-Kandidaten in Woche 1 hat sich geändert".
- Das MotW-Todo nennt die Woche beim Namen; zurückgehaltene Aufnahmen zählen
  als veraltet erst nach ihrer Woche, auch in den neuen Wochen.
- `/dev/ui`: eine unveröffentlichte Woche 1 im MotW-Workspace.

**Out:** Die Aufnahmen-Seite listet weiterhin nur reguläre Matches; vor der
Veröffentlichung gibt es dort nichts freizugeben. Sie kommt mit Slice 3.
Stream-Foto-Angebote kommen erst mit der Veröffentlichung, weil die
Spieler-Spalten bis dahin leer sind.

## Tests

- Pure: offene Seiten (Name, Kandidaten, settled), Recordability und
  Sortierung, `lineUpChange` und die Kandidaten der Woche, `weekNames`,
  MotW-Todo mit Wochennamen, Besetzungs-Todo.
- Integration: Kontext eines unveröffentlichten Relegations-Matches (kein
  Spielfrei), Nominieren mit Schnappschuss, Bestätigen abgelehnt, eine
  Ergebniskorrektur ändert die Besetzung und wird erkannt.
