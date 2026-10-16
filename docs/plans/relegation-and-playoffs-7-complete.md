# Relegation und Playoffs 7: Saison abschließen

**Status: done** (2026-10-12). Slice 7 von [[relegation-and-playoffs]];
vor den Ansichten gebaut, die das Saisonergebnis zeigen.

Nach dem Finale schließen Staff die Saison ab: Alle Ergebnisse werden
endgültig, und pro Spieler wird festgeschrieben, ob er auf- oder absteigt
oder bleibt, dazu der Meister.

## Scope

**In:**

- `seasonOutcomes` (`src/features/playoffs/season-outcome.ts`, pur): aus den
  maßgeblichen Tabellen (mit entschiedenen Gleichständen) und dem aufgelösten
  Stand von Relegation und Playoffs. Direkte Zonen nach Platz; Relegation
  unten: gewonnen steigt auf, sonst bleibt; oben: gewonnen bleibt, sonst
  steigt ab (Doppelniederlage: oben ab, unten bleibt). Ein offener
  Gleichstand wartet. Ein Tiebreaker mit Doppelniederlage gibt beiden den
  schlechtesten Ausgang, zu dem der geteilte Platz führen konnte. Meister:
  Sieger des Finales, "none" nach einer Doppelniederlage im Finale oder ohne
  Playoff-Plätze, ein einzelner Playoff-Platz ist direkt Meister.
- Schema: `registration_windows.season_completed_at`;
  `placements.season_outcome` (`promoted | stays | demoted`) und
  `placements.champion`.
- Sperre: Der Trigger lehnt nach dem Abschluss jede Ergebnisänderung der
  Saison ab; `resultLockError(matchId)` ersetzt die reine Regular-Prüfung und
  nennt den Grund ("Die reguläre Saison ist abgeschlossen." bzw. "Die Saison
  ist abgeschlossen."). Später Drop, Rücknahme und Staff-Reihenfolge sind
  danach abgelehnt; die Match-Seite zeigt den Grund.
- `seasonCompletionState`: Ergebnis so weit, was noch offen ist (Ausgänge,
  Meister, Disputes, Zurückgehaltenes nach der regulären Saison).
  `completeSeason`: nur Staff, nur wenn nichts offen ist, einmal.
- Staff: auf `/staff/relegation-playoffs` das Panel mit dem Knopf (Dialog nur mit
  Eintippen "Saison abschließen"), danach "Saison abgeschlossen"; Todo auf
  `/staff`, sobald es geht.
- `/dev/ui`: das Panel offen, bereit, abgeschlossen.

**Out:** Die Phase der Saison bleibt `regular_season`, bis die nächste
Anmeldung sie ablöst (die Seiten bleiben als Archiv sichtbar); ein eigener
Phasenname folgt mit den Ansichten, falls sie ihn brauchen.

## Tests

- Pure: direkte Zonen, Relegation in beide Richtungen, Doppelniederlage in
  der Relegation, kein Meister, offener und entschiedener Gleichstand,
  Tiebreaker mit Doppelniederlage.
- Integration: Abschluss abgelehnt solange etwas zurückgehalten oder offen
  ist; danach Ergebnisse und Meister festgeschrieben, jede Änderung in
  Aktion und Datenbank abgelehnt, kein zweiter Abschluss.
