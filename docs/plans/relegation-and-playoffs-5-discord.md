# Relegation und Playoffs 5: Discord

**Status: done** (2026-10-12). Slice 5 von [[relegation-and-playoffs]].

## Scope

**In:**

- Ergebnis-Posts für Tiebreaker, Relegation und Playoffs wie in der Saison,
  Kopfzeile mit der Stufe statt "Spieltag N" ("VGC Bundesliga · Relegation ·
  Division 1 und 2", "VGC Bundesliga · Playoffs · Halbfinale", "VGC
  Bundesliga · Tiebreaker · Division 2a"). Channel per `resultChannelFor`
  mit `matches.tier` (bei der Relegation die obere Division, Playoffs 1).
  VOD-Ankündigung nennt die Woche ("Match of the Week · Woche 1").
  Zurückgehaltenes postet nichts; ein Folge-Match kann vor der Freigabe
  seiner Quelle kein Ergebnis haben (3b), also auch keinen Post.
- Season-Sync in Räumen: ein Raum ist eine Gruppe oder eine Stufe, jeweils
  Rolle plus privater Channel (`planRoomResources`, `groupRoom`,
  `stageRoom`). Ab der Veröffentlichung bekommen die Stufen, die die Saison
  hat, ihren Raum: Rollen "Playoffs" und "Relegation", Channels
  `💬-playoffs-chat-💬` und `💬-relegation-chat-💬`. Die Rolle hat, wer in der
  Stufe ein Match hat (`listPlacedPlayers` liefert `stages`); eine Rolle ohne
  Match kommt wieder ab. Getrackt in `discord_season_resources` mit
  `sub_division_id` null und eigenen Kinds, eindeutig pro Saison und Kind.
  Bleiben bis zum Aufräumen nach der Saison. Das Veröffentlichen stößt die
  Sync an; der periodische Job konvergiert den Rest.

## Tests

- Pure: Kopfzeile nach der Saison, VOD mit Woche; Stufen-Räume anlegen und
  behalten, eine Gruppen-Rolle zählt nie als Stufen-Rolle; Stufen-Rolle für
  wer ein Match hat, ohne Match kommt sie ab.
- Integration: Spieler ohne Stufe, Stufen-Ressourcen einmal pro Saison und
  Kind.
