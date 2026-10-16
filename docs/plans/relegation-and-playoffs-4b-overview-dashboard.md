# Relegation und Playoffs 4b: Übersicht, Dashboard, Aufnahmen

**Status: done** (2026-10-12). Zweiter Teil von Slice 4 (mit 3c) in
[[relegation-and-playoffs]]. Rudimentär, aber gestaltet; Feinschliff im
Design-Durchgang.

## Scope

**In:**

- Liga-Übersicht: unter dem MotW-Block ein Block "Playoffs" mit der
  laufenden Runde (nach dem Finale das Finale mit seinem Sieger) und den Wegen zu
  `/playoffs` und `/relegation`. Die Zeitleiste des Spielplans bekommt nach
  den Spieltagen eine zweite Gruppe mit den Wochen danach, beide Gruppen
  unten benannt ("Spieltage", "Relegation und Playoffs"); Kopfzeile "Woche 1
  von 3" und die Daten, oben in der Seite "Woche 1 / 3". Sie öffnet auf der
  laufenden Woche, sonst der zuletzt begonnenen (`afterSeasonWeekToShow`,
  pur). Eine Woche zeigt, was die Division spielt (`divisionWeek`, pur,
  unabhängig von der gewählten Gruppe): ihre Tiebreaker in Woche 1 (wer um
  welchen geteilten Platz spielt, Ergebnis mit Spoiler-Schutz, "Ergebnis
  folgt" solange zurückgehalten), die Relegation an jeder ihrer Grenzen
  ("Relegation · Division 1 und 2") und in Division 1 die Playoff-Runde,
  alle als kompakte Karten wie im Bracket; sonst "Diese Division spielt in
  dieser Woche nicht."
- Spieler-Dashboard (`dashboardHero`, pur): ab der Veröffentlichung ersetzt
  ein eigener Hero den der Saison. Mit offenem Match: Stufe, Gegner oder was
  die Seite ist ("Gegner steht noch nicht fest"), "Ergebnis melden", Chips
  Sieg/Niederlage (Relegation: Klassenerhalt/Abstieg oben, Aufstieg/
  Klassenerhalt unten; Playoffs: nächste Runde oder "Meister" /
  "Ausgeschieden"). Ohne: "Dein Saisonergebnis" (Aufstieg, Abstieg,
  Klassenerhalt, nächste Division), der Meister in Gold.
- Aufnahmen: alle Wochen (Namen wie beim MotW), Tiebreaker, Relegations- und
  Playoff-Matches, sobald ihre Spieler feststehen (`settledLateMatches`).
  `weekNames` liegt jetzt in `src/features/season/week-names.ts`.
- Spielplan des Dashboards (`afterSeasonSchedule`, pur): unter den
  Spieltagen eine Trennzeile mit den Stufen des Spielers ("Tiebreaker ·
  Playoffs"), darunter seine Matches nach der regulären Saison mit "W1",
  "W2" in der Spalte des Spieltags und der Stufe unter dem Gegner
  ("Relegation", "Playoffs · Halbfinale", "Tiebreaker · Platz 4"). Ergebnis
  mit eigenem Score, "Kampflos gewonnen/verloren", sonst die Woche, die
  laufende orange, eine überfällige rot. Solange der Spieler in den Playoffs
  noch nicht ausgeschieden ist, folgen die Runden, die ein Sieg bringt,
  blass und ohne Link ("Bei Sieg", "Playoffs · Finale").
- `/dev/ui`: Übersichts-Block, Tiebreaker-Liste, die vier Hero-Zustände, der
  Spielplan nach der regulären Saison, die Übersicht in Woche 1.

- Der Fortschrittsbalken des Dashboards bekommt dieselbe zweite Gruppe
  ("Woche 1 von 2" statt "Spieltag 7 von 7").
- `/favoriten`: dieselbe Zeitleiste; eine Woche danach zeigt die Matches,
  in denen ein Favorit spielt (`favoritesAfterSeasonWeek`, pur), unter
  denselben Labels, sonst "Keiner deiner Favoriten spielt in dieser Woche."

## Tests

- Pure: Hero für oben und unten in der Relegation, offener Gegner, nächste
  Runde und Finale in den Playoffs, Saisonergebnis.
- Pure: Spielplan nach der Saison leer ohne eigene Matches, offenes
  Halbfinale mit dem Finale bei Sieg, nichts mehr nach einer Niederlage,
  Tiebreaker zuerst, überfällige Woche, kampflos entschieden.
- Pure: Übersicht öffnet auf laufender, zuletzt begonnener oder erster
  Woche; mittlere Division mit Tiebreakern und beiden Grenzen, Division 1
  mit Grenze und Playoff-Runde, Division ohne Spiel in der Woche.
