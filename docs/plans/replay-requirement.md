# Replay-Pflicht pro Division

**Status: done** (2026-07-11)

Beweis-Material für gemeldete Matches (Showdown-Replays bzw. Cartridge-Video)
ist **Pflicht in den obersten X Divisionen** und optional in allen darunter.
X ist eine **explizite Preseason-Entscheidung** pro Saison — keine Vorbelegung;
ohne Entscheidung kann die Einteilung nicht finalisiert werden.

Heutige (falsche) Logik: Showdown-Replays sind in *allen* Divisionen Pflicht,
ein Cartridge-Video ist *nie* Pflicht — divisionsunabhängig.

## Semantik

Ein Match in Division `tier` braucht Beweis, wenn `tier <= X`:

| | Pflicht (`tier <= X`) | Optional (`tier > X`) |
|---|---|---|
| Showdown | Replay-Link pro Spiel (wie heute) | Replays optional; wenn angegeben, gültige https-URL |
| Cartridge | Video-Link Pflicht (https) | Video optional (wie heute) |

Unverändert: Teamsheets bleiben überall Pflicht; Replays gibt es
nur für Showdown, Video nur für Cartridge; Free Win / Double Loss brauchen
keinen Beweis. `X = 0` ist erlaubt (nirgends Pflicht).

## Schema & Migration (Live-System!)

- `seedings.replay_required_tiers` **integer, nullable, ohne Default** —
  `null` = noch nicht entschieden. Generierte Migration (add column).
- **Custom-Migration (Backfill):** `update seedings set replay_required_tiers = 2;`
  — die laufende Saison bekommt die vom Orga-Team entschiedene Pflicht für
  Division 1 + 2. Damit funktioniert das Live-System nach dem Deploy sofort
  mit der richtigen Regel; bestehende Reports bleiben unberührt (keine
  rückwirkende Validierung).
- Defensive: sollte eine finalisierte Saison je `null` haben (kann durch Gate
  + Backfill nicht passieren), gilt Beweis-Pflicht überall (konservativ).

## Preseason-Konfiguration

- Die Entscheidung lebt in der **Regel-Ansicht** (Schritt 3 der Leiste, Label
  **"Regeln"**): eine eigene Karte "Replay-Pflicht" über der
  Auf-/Abstiegs-Leiter — Eingabe "Pflicht bis Division ___" (0–20, leer =
  unentschieden) mit Klartext-Zusammenfassung der Wirkung. Unabhängig von den
  Gruppen entscheidbar, speichert debounced. Nur mit Steuerung editierbar,
  bis zum Finalize.
- Schritt 3 ist erst **done, wenn beide Saison-Regeln entschieden sind**
  (Auf-/Abstieg gespeichert **und** Replay-Pflicht gesetzt); das Sublabel
  nennt den nächsten offenen Teil ("Auf- & Abstieg speichern" →
  "Replay-Pflicht festlegen" → "Regeln gespeichert").
- Eigene Action `setReplayRequirement` (Control-Gate wie `configureSeeding`,
  aber **ohne** den PostSeason-Stempel zu berühren — die Regel hat mit den
  Gruppen nichts zu tun). Zod-Schema in `seeding.ts`.
- **Finalize-Gate:** `finalizeSeeding` verlangt zusätzlich
  `replay_required_tiers is not null`. `SeedingProgress` bekommt
  `replayConfigured`; `finalizeGateHint`/`finalizeGateShort` nennen den
  Blocker.
- Nach Finalize nicht mehr änderbar (bewusst: keine Regeländerung mid-season;
  Notfall = SQL).

## Reporting-Validierung

- `ReportContext` (in `report.ts`) bekommt `proofRequired: boolean`;
  `refineReport` setzt die Tabelle oben um. Rein & unit-getestet.
- Server: `getMatchForReport` liefert zusätzlich `proofRequired` (Join
  divisions.tier × seedings.replay_required_tiers); Player-Action
  (`reportMatch`) und Staff-Actions (Result-Editor) reichen es in die Schemas.
- Client: `ReportForm` bekommt `proofRequired` als Prop (Match-Page reicht
  durch) — Chips "Pflicht"/"optional" pro Replay-Feld, Video-Feld
  Pflicht-Markierung, Submit-Gating und Hinweistexte entsprechend. Der
  Staff-Result-Editor validiert nur serverseitig (unverändert minimal).

## Dev-Tooling & Tests

- Dev-Seed: beide Finalize-Pfade (`finalizeDevSeeding`, `generateLadderSeason`)
  setzen `replay_required_tiers = 2` vor dem Finalize.
- Gallery: ReportForm-Specimens in beiden Varianten (Pflicht/optional).
- Unit: `report.test.ts` — alle vier Zellen der Tabelle + Format-Validierung
  optional angegebener Links; `steps.test.ts` — neue Gate-Branches.
- Integration: Wert speichern/lesen; Finalize scheitert ohne Entscheidung,
  klappt mit; `getMatchForReport.proofRequired` für Pflicht- und
  Optional-Division.

## Out of scope

- Mid-Season-Änderung per UI, rückwirkende Prüfung bestehender Ergebnisse,
  Discord-Posts, öffentliche Ansichten (zeigen weiterhin, was da ist).
