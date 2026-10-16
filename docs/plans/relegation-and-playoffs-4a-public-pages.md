# Relegation und Playoffs 4a: Öffentliche Seiten

**Status: done** (2026-10-12). Erster Teil von Slice 4 in
[[relegation-and-playoffs]]. Rudimentär, aber gestaltet; der Feinschliff
kommt mit einem eigenen Design-Durchgang (`design/PLAYOFFS.md` wird dafür
neu geschrieben, der vorhandene Entwurf stammt aus der Zeit mit Oberbegriff).

## Scope

**In:**

- `publicCards` (pur): eine Karte pro Relegations- und Playoff-Match, auf den
  Betrachter zugeschnitten. Zurückgehaltene Ergebnisse und wer sie gewonnen
  hat erreichen Außenstehende nicht ("Sieger HF 1", bzw. der Sitz bei einem
  zurückgehaltenen Tiebreaker); ein offener Freewin ist nicht öffentlich;
  Zustände offen, wartet, gespielt, Ergebnis folgt, kampflos. Dazu
  `bracketRounds`, `publicChampion`, `publicTiebreakers` (für die
  Divisionsansicht in 4b). Loader `publicRelegationPlayoffs` (null vor dem
  Veröffentlichen).
- `/playoffs`: das Bracket, eine Spalte pro Runde mit Runde, Woche und
  Daten im Kopf, Verbindungslinien zur nächsten Runde (am Handy die Runden
  untereinander). `/relegation`: eine
  Karte pro Grenze, Paarungen mit Sitz und Ausgangszeilen (immer zwei, ob
  Aufstieg oder Klassenerhalt). Spoiler-Schutz wie überall: verdeckte
  Ergebnisse als Pille an ihrer Stelle, Namen aus verdeckten Matches als
  Herkunft; Aufdecken deckt die Kette auf.
- Liga-Zeile ab der Veröffentlichung: Übersicht · Playoffs · Relegation ·
  Spielplan · Favoriten (nur was die Saison hat).
- Match-Seite: Ein Match, dessen Besetzung aus einem zurückgehaltenen
  Ergebnis stammt, gibt es bis zur Freigabe nur für Staff und die beiden
  Spieler.
- `/dev/ui`: beide Seiten mit Beispieldaten.

**Out (4b):** Tiebreaker in der Divisionsansicht, Block auf der Übersicht,
Spieler-Dashboard, Aufnahmen-Workspace.

## Tests

- Pure: gespielt mit Score, offen und wartend, zurückgehalten samt Sieger,
  Spieler und Staff sehen es, maskierter Sitz aus einem zurückgehaltenen
  Tiebreaker, offener Freewin, kampflos, Rundennamen, Meister und kein
  Meister; Liga-Zeile mit beiden und mit einem.
