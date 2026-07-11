# Seeding: Schrittleiste, Ansichten & Finalize-Gating

**Status: done** (2026-07-10)

Überarbeitung der Kopfzeile und Navigation der Divisionseinteilung
(`/staff/seeding`). Die Toolbar kommunizierte Fortschritt nur über Zählstände;
welcher Schritt als Nächstes fehlt (insbesondere die Auf-/Abstiegsregeln als
Finalisierungs-Voraussetzung) war nur als Hover-Tooltip sichtbar, und der
Regel-Editor steckte in einem beengten Modal.

## Schrittmodell (pur)

`src/features/seeding/steps.ts`: `seedingSteps(progress)` leitet die vier
Schritte **Platzieren → In Gruppen → Auf- & Abstieg → Finalisieren** mit
Zustand (done / active / pending) und Zählern ab; `finalizeGateHint(progress)`
erzeugt den Gate-Text aus demselben Modell. Schritte werden unabhängig „done"
(Auf-/Abstieg kann vor dem letzten Gruppieren gespeichert sein); „active" ist
der erste offene Schritt in Reihenfolge.

## Schrittleiste = Fortschritt + Navigation

`components/step-bar.tsx`. Die Seite hat unterhalb der Steuerungszeile zwei
Ansichten; die Leiste zeigt den Fortschritt und schaltet zwischen ihnen um:

- Segment **„Platzieren · In Gruppen"** → Sheet-Ansicht (die Arbeit dieser
  Schritte passiert im Sheet).
- Segment **„Auf- & Abstieg"** → Regel-Ansicht.
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
  direkt über der zentrierten Divisions-Leiter; Fehlerliste als Callout über
  den Karten. Beide Ansichten bleiben gemountet — Umschalten versteckt nur,
  ungespeicherte Regel-Änderungen und Sheet-Filter überleben den Wechsel.
  Frische Serverdaten reseeden den Editor nur, wenn keine lokalen Änderungen
  offen sind. ControlBar, Fehlerzeile und Finalize-Banner gelten für beide
  Ansichten.

## Dev-Tooling

- Gallery: Schrittleisten-Zustände (Sheet/Regel-Ansicht aktiv, bereit,
  Beobachter, finalisiert), Regel-Panel gültig/fehlerhaft, Finalize-Dialog.
- `/dev/seed-registrations?grouped=1` (Karte auf `/dev`) baut eine Einteilung,
  in der alle Spieler platziert und gruppiert sind, aber die
  Auf-/Abstiegsregeln noch fehlen — der Zustand, in dem „Auf- & Abstieg" der
  aktive Schritt ist.

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
