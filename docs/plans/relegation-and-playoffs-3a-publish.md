# Relegation und Playoffs 3a: Veröffentlichen und die Sperre

**Status: done** (2026-10-12). Erster Teil von Slice 3 in
[[relegation-and-playoffs]]; Regeln dort.

Staff veröffentlichen Relegation und Playoffs mit einem Klick, sobald die
reguläre Saison nichts mehr offen hat. Damit sind die regulären Ergebnisse
endgültig, die Tiebreaker entstehen, und jeder Sitz mit bekanntem Spieler
wird in sein Match geschrieben.

## Scope

**In:**

- Schema: `registration_windows.regular_season_closed_at`;
  `matches.tie_key` (nur und immer bei Tiebreakern, eindeutig pro Saison);
  `tie_orders` (Staff-Reihenfolge pro Gleichstand, mit Begründung).
- Prüfliste (`publishBlockers`, pur): Spielplan erstellt, letzter Spieltag
  vorbei, kein reguläres Match ohne Ergebnis, kein Dispute, kein offener
  Freewin, keine Aufnahme hält ein reguläres Ergebnis zurück, kein MotW ohne
  VOD, kein offenes Ersatzspieler-Angebot. Jeder Punkt mit Link.
- Aktion `publishRelegationPlayoffs`: in einer Transaktion
  `regular_season_closed_at`, die Tiebreaker-Matches (zwei Spieler an einer
  Grenze, Woche 1) und die Sitze (`seatAssignments`). Ein zweiter Klick ist
  wirkungslos.
- Die Sperre: `regularResultLocked(matchId)` und `regularSeasonClosed(windowId)`
  in Melden, Anfechten, Dispute-Entscheidung, allen Staff-Werkzeugen
  (`staffGate`), Drop und Rücknahme, Ersatzspieler anbieten und annehmen
  (Zurückziehen bleibt), Aufnahme setzen, MotW nominieren, entfernen,
  bestätigen und widerrufen. Dazu der Trigger `reject_closed_regular_write`
  auf `match_results`, `match_games`, `team_sheets`, `disputes`; kaskadierende
  Löschungen gehen durch. Die Match-Seite zeigt bei einem gesperrten Match
  "Die reguläre Saison ist abgeschlossen. Dieses Ergebnis ist endgültig."
  statt Formular, Anfechtung und Staff-Werkzeugen.
- Entscheidungen der Gleichstände (`tieDecisions`): Sieger des Tiebreakers
  vor dem Verlierer, eine Doppelniederlage leert die Sitze (`vacant`), die
  Staff-Reihenfolge bei drei oder mehr. `finalTable` setzt sie ein;
  `syncSeats` schreibt danach jeden bekannten Sitz in sein Match (nur Matches
  ohne Ergebnis, nur nach dem Veröffentlichen).
- Aktion `setTieOrder`: nur nach dem Veröffentlichen, nur genau die
  gleichauf liegenden Spieler, abgelehnt sobald ein Relegations- oder
  Playoff-Match eines von ihnen ein Ergebnis hat.
- Staff-Ansichten: auf `/staff/relegation-playoffs` vor dem Veröffentlichen
  "Vorher klären" mit dem Knopf und dem Satz "Danach sind alle Ergebnisse der
  regulären Saison endgültig."; danach die Reihenfolge-Karten, und statt
  der Vorschau der Stand wie auf den öffentlichen Seiten (Tiebreaker,
  Relegation je Grenze, Bracket), mit allen Ergebnissen,
  auch zurückgehaltenen, und Links zu den Matches
  (`StaffRelegationPlayoffs`). Dialog mit
  der Folge als erstem Satz und dem Eintippwort "Reguläre Saison
  abschließen". Todos auf `/staff`: veröffentlichen (mit Zahl der offenen
  Punkte), Reihenfolge festlegen.
- `/dev/ui`: Prüfliste offen und geklärt, Reihenfolge-Karte.

**Out (3b):** Melden und Match-Seite für Tiebreaker, Relegation und
Playoffs; Nachrücken nach einem Tiebreaker-Ergebnis über die Aktionen; der
Korrektur-Schutz; später Drop; leere Sitze als kampflos.

## Tests

- Pure: Prüfliste, anzulegende Tiebreaker, Sitze, Entscheidungen, leere Sitze.
- Integration: Veröffentlichen abgelehnt bei offenem Dispute, schreibt vorher
  nichts in die Matches, schließt die Saison, legt den Tiebreaker an,
  schreibt bekannte Sitze, nur einmal; Staff-Werkzeug, Drop und Hold
  abgelehnt; der Trigger lehnt direkte Schreibvorgänge ab;
  Staff-Reihenfolge und Tiebreaker-Ergebnis besetzen ihre Sitze.
