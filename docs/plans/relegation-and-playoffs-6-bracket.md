# Relegation und Playoffs 6: Bracket-Fortschritt

**Status: done** (2026-10-12). Slice 6 von [[relegation-and-playoffs]];
vor den Ansichten (Slices 3c, 4) gebaut, weil sie seinen Zustand anzeigen.

Wer eine Runde der Playoffs gewinnt, steht in der nächsten; eine
Doppelniederlage lässt den Platz leer, und der Gegner zieht kampflos ein.

## Scope

**In:**

- `resolveRelegationPlayoffs` (`src/features/playoffs/progression.ts`, pur):
  für jedes Relegations- und Playoff-Match beide Seiten (Spieler, offen,
  leer), ihre Herkunft und der wirksame Ausgang, Runde für Runde. Ein Match
  mit Ergebnis behält seine Spieler; ein leerer Platz gibt das Match an den
  anderen, beide leer ist eine Doppelniederlage (im Finale: kein Meister).
  Die eine Quelle für Sitz-Abgleich, Veröffentlichen, Saisonergebnis und
  Ansichten (`relegationPlayoffsResolved`).
- `syncSeats` schreibt die Spieler jedes Matches ohne Ergebnis aus dem
  Resolver (`playerWrites`): Sitze aus der Tabelle und Sieger der Vorrunde.
  Nach Tiebreaker- und Playoff-Ergebnissen, späten Drops und
  Staff-Reihenfolgen. `seatAssignments` ist darin aufgegangen.
- Korrektur-Schutz für Playoff-Matches: abgelehnt, sobald ein späteres
  Playoff-Match eines der beiden Spieler ein Ergebnis hat (auch durch
  kampflose Runden hindurch, weil der Spieler dort weiter steht).
- Zurückgehaltenes entlang des Brackets: Melden und Freigeben eines Matches
  warten auf die Freigabe des Vorrunden-Matches, aus dem ein Spieler kommt.

## Tests

- Pure: Sitze der ersten Runde, Sieger rücken nach, Doppelniederlage im
  Halbfinale, kein Meister, später Drop, gespielte Matches behalten ihre
  Spieler, offener und leerer Relegationssitz, `playerWrites`.
- Integration: Halbfinals besetzt, Sieger im Finale, Korrektur folgt solange
  das Finale offen ist, danach gesperrt; Doppelniederlage im Halbfinale gibt
  das Finale ab; ein zurückgehaltenes Halbfinale sperrt das Finale.
