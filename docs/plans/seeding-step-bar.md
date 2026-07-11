# Seeding: Schrittleiste, Ansichten & Finalize-Gating

**Status: done** (2026-07-10)

Überarbeitung der Kopfzeile und Navigation der Divisionseinteilung
(`/staff/seeding`). Die Toolbar kommunizierte Fortschritt nur über Zählstände;
welcher Schritt als Nächstes fehlt (insbesondere die Auf-/Abstiegsregeln als
Finalisierungs-Voraussetzung) war nur als Hover-Tooltip sichtbar, und der
Regel-Editor steckte in einem beengten Modal.

## Schrittmodell (pur)

`src/features/seeding/steps.ts`: `seedingSteps(progress)` leitet die vier
Schritte **Platzieren → Gruppen bilden → Regeln → Finalisieren** mit
Zustand (done / active / pending) und Zählern ab; `finalizeGateHint(progress)`
erzeugt den Gate-Text aus demselben Modell. Schritte werden unabhängig „done"
(die Regeln können vor dem letzten Gruppieren gespeichert sein); „active" ist
der erste offene Schritt in Reihenfolge. Der Schritt **„Regeln"** umfasst
beide Saison-Regeln und ist erst done, wenn Auf-/Abstieg gespeichert **und**
die Replay-Pflicht festgelegt ist (siehe `replay-requirement.md`).

## Schrittleiste = Fortschritt + Navigation

`components/step-bar.tsx`. Die Seite hat unterhalb der Steuerungszeile zwei
Ansichten; die Leiste zeigt den Fortschritt und schaltet zwischen ihnen um:

- Segment **„Platzieren · Gruppen bilden"** → Sheet-Ansicht (die Arbeit
  dieser Schritte passiert im Sheet).
- Segment **„Regeln"** → Regel-Ansicht (Auf-/Abstieg + Replay-Pflicht); das
  Sublabel nennt den nächsten offenen Teil („Auf- & Abstieg speichern" →
  „Replay-Pflicht festlegen" → „Regeln gespeichert" / „Änderungen nicht
  gespeichert").
- Die aktive Ansicht ist unterlegt (Brand-Orange-Tönung); jeder Schritt trägt
  weiterhin sein Status-Icon (✓/●/○) und ggf. Zähler.
- **„Finalisieren"** ist keine Ansicht, sondern die gegatete Schluss-Aktion:
  Primary-Button sobald alles bereit ist, vorher deaktiviert mit
  Tooltip-Begründung (`finalizeGateHint`); für Beobachter und nach Finalize
  reiner Status-Chip. Der Type-to-confirm-Dialog (`finalize-dialog.tsx`) ist
  controlled und wird nur von diesem Button geöffnet.

## Ansichten

- **Sheet-Ansicht:** unverändert Sheet + BulkBar; die Konfigzeile
  (Divisionen, Gruppengröße, Alle Gruppen generieren, Suche, Filter) gehört zu
  dieser Ansicht.
- **Regel-Ansicht** (`post-season-panel.tsx`, ehem. Dialog): eigene
  Aktionszeile (Validierungsstatus, „Ungespeicherte Änderungen", Speichern)
  direkt über dem zentrierten Inhalt — zuerst die Karte **„Replay-Pflicht"**,
  darunter die Divisions-Leiter; Fehlerliste als Callout über den Karten.
  Der Speichern-Zustand hängt am **Server-Stempel** (`postSeasonConfiguredAt`),
  nicht nur an lokalen Änderungen: Gruppen-Regenerierung oder Config-Änderung
  löschen den Stempel, und der Button wird wieder aktiv, auch wenn die Werte
  unverändert aussehen (sonst Finalize-Sackgasse). Beide Ansichten bleiben
  gemountet — Umschalten versteckt nur, ungespeicherte Regel-Änderungen und
  Sheet-Filter überleben den Wechsel. Frische Serverdaten reseeden den Editor
  nur, wenn keine lokalen Änderungen offen sind. Steuerungs-Pill, Fehlerzeile
  und Finalize-Banner gelten für beide Ansichten.

## Dev-Tooling

- Gallery: Schrittleisten-Zustände (Sheet/Regel-Ansicht aktiv, bereit,
  Beobachter, finalisiert), Regel-Panel gültig/fehlerhaft, Finalize-Dialog.
- `/dev/seed-registrations?grouped=1` (Karte auf `/dev`) baut eine Einteilung,
  in der alle Spieler platziert und gruppiert sind, aber beide Saison-Regeln
  noch fehlen — der Zustand, in dem „Regeln" der aktive Schritt ist.

## Nebenbei behoben

Der frühere „deaktivierte" Finalisieren-Button öffnete seinen Dialog trotzdem:
der `DialogTrigger` saß auf einem Tooltip-`div`, und der disabled-Button ließ
den Klick durchfallen (`pointer-events-none`). Strukturell beseitigt — beide
Dialog-Trigger-Konstrukte existieren nicht mehr. Server-seitig war Finalize
immer abgesichert.

## Design-Pass

Umgesetzt nach `design/DIVISIONS-EINTEILUNG-ABLAUF.md` (2026-07-11): eigene
Stepper-Zeile mit nummerierten Kreisen und Fortschritts-Sublabels, Steuerung
als Pill in der Titelzeile (statt eigener Leiste), Breadcrumb statt
Zurück-Zeile, Finalize-Blocker inline lesbar (`finalizeGateShort`),
Beobachter- vs. Finalisiert-Read-only im Sheet getrennt. Nur Views; einzige
Logik-Ergänzungen: `finalizeGateShort` + `rulesStepSublabel` in `steps.ts`
(unit-getestet) und der Status-Callback des Regel-Panels.

## Out of scope

- Kein Schema-/Query-/Action-Change, keine Discord-Touchpoints.

## Tests

Unit (`steps.test.ts`): frisches Seeding, teilweise platziert,
platziert-aber-ungruppiert, Auf-/Abstieg vor Gruppierung gespeichert
(out-of-order done), bereit zum Finalisieren, finalisiert, leere Saison,
alle drei `finalizeGateHint`-Texte. Integrationstests unverändert (keine
Server-Änderung).
