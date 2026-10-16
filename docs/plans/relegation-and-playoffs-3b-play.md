# Relegation und Playoffs 3b: Spielen

**Status: done** (2026-10-12). Zweiter Teil von Slice 3 in
[[relegation-and-playoffs]]; Regeln dort.

Nach dem Veröffentlichen lassen sich Tiebreaker, Relegation und die Matches
der Playoffs mit Sitzen aus der Tabelle spielen, melden und korrigieren wie
reguläre Matches, mit den Regeln, die nur hier gelten.

## Scope

**In:**

- `getMatchForReport` liest jedes Match über `matches.window_id`: `stage`,
  `windowId`, `weekName` ("Spieltag 3", "Woche 1"); ein Nicht-Regular-Match
  heißt nach seiner Stufe (`matchStageTitle`: "Tiebreaker · Division 2a",
  "Relegation · Division 1 und 2", "Playoffs · Halbfinale"). Replay-Pflicht
  nach `matches.tier` (bei der Relegation die obere Division). Ein Match ohne
  feste Besetzung hat weiter keine Seite. Die Anzeige-Komponenten nehmen
  `weekName`.
- `matchSchedulePublished`: ein Nicht-Regular-Match ist veröffentlicht, sobald
  Relegation und Playoffs es sind.
- Drops werden pro Saison gelesen (`droppedIdsForWindow`), nicht pro Gruppe.
- Wirksamer Ausgang (`effectiveOutcome`, pur): Drop der Saison überschreibt
  alles, später Drop und leerer Sitz entscheiden nur ein Match ohne Ergebnis,
  beide abwesend ist eine Doppelniederlage. Die Entscheidungen der
  Gleichstände rechnen damit.
- Korrektur-Schutz (`outcomeChangeRefusal`): Freewin bestätigen und vergeben,
  Doppelniederlage, Bearbeiten, Wiedereröffnen und Dispute-Entscheidung werden
  abgelehnt, wenn sie den gezählten Ausgang eines Tiebreakers oder
  Playoff-Matches ändern und ein darauf aufbauendes Match ein Ergebnis hat.
  Derselbe Ausgang ist keine Änderung. Nach jeder Änderung schreibt
  `afterResultChange` die Sitze eines Tiebreakers neu.
- Später Drop: `placements.late_dropped_at/_by_id/late_drop_reason`;
  `lateDropPlayer` (nur nach dem Veröffentlichen, nur mit offenem Match) und
  `undoLateDrop` (mit Korrektur-Schutz). Melden ist dann abgelehnt; die
  Match-Seite zeigt das Match als durch Drop entschieden. Staff droppen auf
  der Match-Seite (Grund, Name eintippen, Folge vorher genannt).
- Zurückgehaltenes zwischen Tiebreaker und Sitz: Melden und Staff-Werkzeuge
  sind abgelehnt, solange der Tiebreaker zurückgehalten ist, aus dem ein
  Spieler des Matches kommt, außer das Match ist selbst markiert; Freigeben
  (Aufnahme, MotW-VOD) erst nach dem Tiebreaker.
- Discord-Posts für diese Matches bleiben bis zu ihrem eigenen Teil aus.
- `/dev/ui`: der Drop auf der Match-Seite.

**Out:** Folge-Matches im Bracket füllen und die Ketten dazu (Slice 6);
öffentliche Ansichten und die Darstellung leerer Sitze (Slice 4).

## Tests

- Pure: wirksamer Ausgang in allen Fällen, Stufentitel.
- Integration: Ergebnis eines Tiebreakers ändern verschiebt den Sitz, solange
  nichts darauf aufbaut, und ist danach gesperrt (derselbe Ausgang bleibt
  erlaubt); zurückgehaltener Tiebreaker sperrt Melden und Freigeben des
  Folge-Matches; später Drop entscheidet und lässt sich zurücknehmen; kein
  Drop ohne offenes Match.
