# Relegation und Playoffs 8: Stream-API

**Status: done** (2026-10-12). Slice 8 von [[relegation-and-playoffs]];
gebaut zusammen mit dem Gegenstück in `../gemeinde-streams`
(`docs/plans/buli-hub-source.md` dort).

Die Stream-API (`docs/plans/stream-api.md`) trägt auch die Matches nach der
regulären Saison, damit die Regie eine Relegation oder ein Finale genauso
auf den Stream bringt wie einen Spieltag.

## Scope

**In:**

- Liste und Detail führen jedes gespielte Match der Saison (normales
  Ergebnis), welche Stufe auch immer. Ein Match ohne beide Spieler fehlt,
  also nichts vor der Veröffentlichung (die Spieler-Spalten sind bis dahin
  leer).
- Neue Felder je Match: `stage` (`regular | tiebreaker | relegation |
  playoff`), `weekName` ("Spieltag n", danach "Woche k", gezählt ab der
  ersten Woche nach dem letzten regulären Spieltag) und `roundLabel` (was das
  Overlay als Runde zeigt: "Spieltag n", "Tiebreaker", "Relegation",
  "Playoffs · Halbfinale"). `group` heißt bei der Relegation "Division t und
  t+1" ("t/t+1"), bei den Playoffs "Playoffs" ("PO"), beim Tiebreaker die
  Tabelle, die er entscheidet. Die Benennung ist pur (`streamNaming` in
  `src/features/stream-api/to-stream-match.ts`).
- `record` im Detail läuft nach der regulären Saison weiter: reguläre Bilanz
  plus die früheren Matches des Spielers außerhalb der regulären Saison
  (`recordAfterSeason`, pur), ohne zurückgehaltene und ohne dieses Match.
- `round` bleibt die Zahl des Spieltags bzw. der Woche, damit ein älterer
  Client weiter filtern kann.

**Out:**

- Ein Bracket- oder Tabellen-Overlay; kommt mit eigener Route, sobald der
  Stream eines hat.

## Gegenstück in gemeinde-streams

- Der Client liest die drei Felder optional (`stage` mit Vorgabe
  `regular`), `hubWeekName` und `hubRoundLabel` fallen auf "Spieltag n"
  zurück.
- Die Kopie im Dokument trägt den `roundLabel` als `round`, so zeigt das
  Overlay "Relegation" statt einer Wochennummer.
- Die Regie filtert nach Woche (benannt mit `weekName`) und sucht auch in
  der Stufe.

## Tests

- Unit: `streamNaming` für alle vier Stufen, `recordAfterSeason`
  (Doppelniederlage, Ausschluss, spätere Wochen zählen nicht).
- Integration: ein Relegationsmatch in Liste und Detail mit Stufe, Namen,
  Gruppe und der weiterlaufenden Bilanz.
- gemeinde-streams: Parsen mit und ohne die neuen Felder, Zeilen und Suche
  der Regie mit einem Relegationsmatch.
