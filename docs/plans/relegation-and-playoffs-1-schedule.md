# Relegation und Playoffs 1: Spielplan und Vorschau

**Status: done** (2026-10-11). Slice 1 von [[relegation-and-playoffs]]; dort stehen
die Regeln (Sitze, Losnummern, Paarungen, Bracket). Hier nur, was diese Slice
baut.

Staff legen den Spielplan für Relegation und Playoffs fest, sobald der Termin
steht, und sehen ab dann live, wer nach dem aktuellen Stand gegen wen spielt.
Nichts davon erreicht Spieler; veröffentlicht wird in Slice 3.

## Scope

**In:**

- Schema: `matches` bekommt `window_id` (not null, aus der Gruppe
  nachgetragen), `stage` (`regular | tiebreaker | relegation | playoff`),
  `tier` und `position`; `sub_division_id` und `player_a_id` werden nullable.
  Check: genau die regulären Matches haben eine Gruppe und immer Spieler A.
  `matchdays.regular` (boolean, Standard true). Losnummern
  `placements.lot_number` und `sub_divisions.lot_number`
  (`default random()`).
- `matchdaysForWindow` liefert nur die regulären Spieltage, so behalten alle
  bisherigen Aufrufer ihre Bedeutung ("Spieltag n von m", Fortschritt,
  Ersatzspieler-Einstieg). `allMatchdaysForWindow` liefert alle Wochen.
- Pure Logik:
  - `src/features/final-table/`: Platzfolge einer maßgeblichen Tabelle
    (Gedroppte ans Ende, Los bei Gleichstand innerhalb einer Zone),
    Gleichstände an Zonengrenzen (Tiebreaker oder Staff-Reihenfolge), Sitze
    mit Besetzung (ein Spieler, Kandidaten, oder offen).
  - `src/features/relegation/pairings.ts`: Töpfe und Paarungen pro Grenze.
  - `src/features/playoffs/bracket.ts`: Setznummern mit Gruppentrennung,
    Bracket mit Freilosen, Rundennamen und Match-Kürzel, Herkunft jeder Seite.
  - `src/features/schedule/relegation-playoffs.ts`: Zahl der Wochen, die
    anzulegenden Matches, Standard-Deadlines.
- Aktion "Spielplan für Relegation und Playoffs erstellen"
  (`createRelegationPlayoffsSchedule`): nur Staff, nur in der laufenden
  regulären Saison, nur einmal. Eingabe wie beim regulären Spielplan (eine
  Deadline pro Woche), erste Deadline nach dem letzten Spieltag. Legt die
  Wochen und die Matches (ohne Spieler) in einer Transaktion an.
- Staff-Ansichten:
  - Eigene Staff-Seite `/staff/relegation-playoffs` (Eintrag "Relegation
    und Playoffs" in der Staff-Navigation, solange die Saison läuft), oben
    die vier Schritte Spielplan erstellen · Veröffentlichen · Spielen ·
    Saison abschließen: vor dem Erstellen eine Karte mit dem Knopf,
    danach die Vorschau (Wochen; Relegation pro Grenze; Playoffs pro Runde;
    Gleichstände an Zonengrenzen). Jede Seite einer Paarung zeigt Sitz und
    aktuelle Besetzung ("Stand jetzt"), Kandidaten bei offenem Gleichstand,
    oder die Herkunft ("Sieger VF 1").
  - `/staff` bekommt das Todo "Spielplan für Relegation und Playoffs
    erstellen" ab dem vorletzten Spieltag, mit dem Dialog als Aktion.
- `relegation_unbalanced` in `validatePostSeason` mit Meldung im
  Auf-&-Abstiegs-Dialog der Einteilung.
- Dialog-Fakt "Saisonende" im regulären Spielplan heißt "Letzter Spieltag".
- `/dev/ui`: die Vorschau mit Beispieldaten (offene Kandidaten, Freilose,
  Gleichstand ab drei).

**Out:** Veröffentlichen, Tiebreaker-Matches, Sperre, alles Öffentliche,
Match of the Week (Slice 2).

## Datenmodell im Detail

- Relegations-Match: `stage = relegation`, `tier` = obere Division,
  `position` = Index der Paarung an dieser Grenze, `round` = erste Woche.
- Playoff-Match: `stage = playoff`, `tier = 1`, `position` = Index in seiner
  Runde, `round` = Woche der Runde. Freilos-Paarungen der ersten Runde
  existieren nicht als Match; die Herkunft einer späteren Seite löst sie auf.
- Die Herkunft einer Seite wird nicht gespeichert: Sie folgt pur aus
  (`stage`, `tier`, `position`, Woche) und der Konfiguration der Einteilung,
  die seit der Finalisierung feststeht.
- Unique: (`window_id`, `stage`, `tier`, `round`, `position`) für
  nicht-reguläre Matches.
- FK `matches.window_id` → `registration_windows` in einer Custom-Migration.

## Tests

- Pure: Platzfolge (Drops, Los innerhalb einer Zone, Replacements),
  Gleichstände an jeder Grenzart (zwei, drei, innerhalb der Zone, unter
  Gedroppten), Sitze mit Kandidaten, Töpfe und Paarungen (Gruppenmodus,
  Gesamttabelle, ungleiche Gruppengrößen, Gruppen-Los), Bracket (2, 3, 4, 5,
  6, 8, 12 Plätze; Freilose; Gruppentrennung mit 2/3/4 Gruppen; Abbruch, wenn
  keine Zuordnung existiert), Herkunft aller Seiten, Wochenzahl, Matches der
  Erstellung, `relegation_unbalanced`.
- Integration: Migration (Bestandsdaten bekommen `window_id`, Losnummern),
  Erstellen (Gate, Wochen, Matches, nur einmal), bisherige Leser sehen die
  neuen Matches und Wochen nicht (Spielplan, Woche, Übersicht,
  Ersatzspieler), Vorschau-Daten aus einer geseedeten Saison.
