# Eigene Teamsheet-Pastes + geführte Abgabe beim Melden

**Status: fertig** (2026-08-07) — eigener Paste-Dienst unter `/pastes/<uuid>`,
alle drei Abgabewege im Meldeformular, Staff und Dispute bearbeiten Teamsheets
im Modal. Gegen den lokalen Stack und gegen beide echten Paste-APIs verifiziert.

## Kontext

Beim Melden eines Ergebnisses verlangt das Formular heute zwei Pokepaste-Links und
prüft davon genau eine Sache: dass die URL auf `pokepast.es` zeigt (`isPokepasteUrl`
in `src/features/reporting/report.ts`). Was hinter dem Link steht, sieht niemand an.
Ein Sheet ohne Wesen, ein Sheet mit offengelegten EVs, ein Link auf ein leeres Paste:
alles geht durch. Gefordert ist ein Open Team Sheet, und genau das ist der einzige
Zustand, den die Liga nicht durchsetzt.

Diese Feature dreht das um. Wir bauen einen eigenen Paste-Dienst, führen jede Abgabe
durch ihn und speichern ausschließlich das Ergebnis: das vollständige OTS, ohne Stats.
Nicht weil ein eigener Paste-Dienst an sich Wert hat, sondern weil er die einzige
Stelle ist, an der wir "vollständig" und "ohne Stats" gleichzeitig erzwingen können.

Vorbild für Parsing und Darstellung ist `justhit.gg` (Astro, gleicher Maintainer). Von
dort übernommen: die Mega-Auflösungsregeln, das Sprite-Bucket und der Aufbau der
Team-Karten. Nicht übernommen: das Astro-Rendering und die Bucket-Build-Skripte.

### Format

Die Liga spielt **Pokémon Champions**. Showdown unterstützt das Spiel vollständig
(`gen9championsvgc2026regmb`), Spieler bauen ihre Teams dort. Champions kennt kein
Terakristall, dafür Mega-Entwicklungen und ein eigenes EV-System (Werte bis ~32 statt
252). Formatunterschiede werden **nicht** modelliert: es gibt genau ein Regelwerk,
und das ist das aktuelle. Später eventuell.

## Scope

**Drin**

- Eigener Paste-Dienst: Parsen, Validieren, Strippen, Speichern, Rendern unter
  `/pastes/<uuid>`, öffentlich lesbar.
- Drei Abgabewege beim Melden: Pokepaste-Link, VRPaste-Link, direkter
  Showdown-Export über ein Modal.
- Validierung aller drei Wege mit konkreten, benennbaren Fehlern.
- Umbau des Spieler-Meldeformulars, des Staff-Ergebnis-Editors und der
  Dispute-Korrektur.
- Anpassung von Match-Ansicht, öffentlicher Match-Ansicht und Discord-Posts auf
  die neuen URLs.

**Draußen**

- Jede Art von Legalitätsprüfung: ob ein Pokémon die Attacke lernen kann, ob die
  Fähigkeit zu ihm gehört, ob das Team im Regulation-Set legal ist. Bewusst nicht.
- Formatverwaltung (mehrere Regulation Sets, Formatprüfung gegen die Saison).
  Pokepaste liefert das Format in `notes`, VRPaste in `format` — beides bleibt
  ungenutzt, ist aber der Anknüpfungspunkt, falls es später kommt.
- Öffentliche Paste-Erstellung. Pastes entstehen ausschließlich beim Melden bzw.
  beim Bearbeiten eines Ergebnisses.
- Backfill alter Daten. Die Produktionsdatenbank steht in der Anmeldephase der
  ersten Saison und enthält noch kein einziges Ergebnis, also auch keinen
  Pokepaste-Link. Die beiden Spalten werden ersatzlos gelöscht.

## Was ein gültiges Teamsheet ist

Genau diese Regeln, sonst nichts:

- **Genau 6 Pokémon.** Weniger oder mehr ist ein Fehler.
- Pro Pokémon **Pflicht**: Spezies, Fähigkeit, Wesen, **1 bis 4 Attacken**.
- Pro Pokémon **optional**: Item. Ein Pokémon ohne Item ist gültig.
- **Alles andere wird verworfen, nicht bemängelt**: Tera-Typ, EVs, IVs, Level,
  Spitzname, Geschlecht, Shiny, Freundschaft, Ball, Gigadynamax und was sonst noch
  in einem Showdown-Export stehen kann. Ein Paste mit Stats ist kein Fehler, die
  Stats sind danach nur weg.

Stats werden **nicht** per Textersetzung entfernt, sondern dadurch, dass wir aus dem
geparsten Set ein neues Set mit ausschließlich den fünf erlaubten Feldern bauen und
dieses neu serialisieren. Ein Feld, das wir nicht bewusst übernehmen, kann so gar
nicht erst in die Datenbank gelangen.

## Bibliotheken

Exakt die Versionen, die `justhit.gg` produktiv fährt, exakt gepinnt wie alles andere:

| Paket | Version | Wofür |
| --- | --- | --- |
| `@pkmn/sets` | 5.2.0 | `Team.import` / `Sets.exportSet` — Parsen und Reserialisieren |
| `@pkmn/dex` | 0.10.11 | Mega-Stein → Mega-Spezies, Basisname, Mega-Fähigkeit, Wesen +/-, Item-ID |
| `@pkmn/img` | 0.3.4 | Sprite-URLs (CDN-Fallback), Item-Icon-Styles, Box-Icons |

Zur Einordnung, weil es die Wartungslast bestimmt: `@pkmn/sets` ist ein reiner
Textparser ohne Spieldaten (`Fakemon-Mega @ Fakeite` parst er anstandslos). Parsen,
Strippen und Validieren hängen also an **keinem** Datenstand. `@pkmn/dex` ist für uns
faktisch eine Kosmetiktabelle: Mega-Badge, Sprite-ID, Wesen-Pfeile. Veraltete Dex-Daten
können deshalb niemals eine gültige Abgabe ablehnen oder ein gespeichertes Sheet
verfälschen — schlimmstenfalls fehlt einem frisch gepatchten Champions-Mega das
Mega-Sprite. `@pkmn/dex` 0.10.11 ist die aktuelle Veröffentlichung und kennt alle 93
Mega-Steine inklusive der Champions-Neuzugänge.

Für den Fall, dass ein Champions-Patch schneller ist als `@pkmn`: eine lokale
Override-Map in `mega.ts` (Stein → Mega-Spezies, Mega-Spezies → Fähigkeit), im Geist
von `FORM_FIXUP` in `justhit.gg/scripts/build-sprites.mjs`. Ein Dutzend Zeilen statt
einer Build-Pipeline gegen `smogon/pokemon-showdown`.

`@pkmn/dex` gehört **nie** in ein Client-Bundle. Die Paste-Seite ist eine Server
Component, die Vorschau im Modal kommt aus der Server Action.

## Schema

Neue Tabelle **`team_sheets`** (`src/db/schema.ts`), FKs und RLS in einer
Custom-Migration wie bei den anderen Tabellen:

- `id uuid pk default random()` — zugleich der öffentliche Slug unter `/pastes/<id>`.
- `matchId uuid not null` → `match_results.match_id`, ON DELETE CASCADE.
- `playerId uuid not null` → `auth.users`, ON DELETE CASCADE.
- `source teamsheet_source not null` — neues Enum `["pokepaste","vrpaste","import"]`.
- `ots text not null` — das kanonische, gestrippte Sheet.
- `createdAt` / `updatedAt`.
- **UNIQUE `(matchId, playerId)`** — ein Sheet pro Spieler pro Match.

RLS an, keine Policies (Server-only wie überall), Zugriff läuft über Drizzle.

**`match_results`**: `playerATeamUrl` und `playerBTeamUrl` **entfallen**. Die Zuordnung
ergibt sich aus `team_sheets(matchId, playerId)` — eine Wahrheit statt zweier, die
auseinanderlaufen können. Produktion enthält keine Ergebnisse, die Migration droppt
die Spalten also ohne Backfill.

### Warum Überschreiben statt neues Paste

Korrigiert Staff ein Ergebnis oder ersetzt eine Dispute-Entscheidung ein Sheet, wird
die bestehende Zeile per Upsert auf `(matchId, playerId)` **aktualisiert**. Die URL
bleibt stabil.

Ein Paste ist bei uns kein eigenständiges Dokument, sondern die Identität eines
Match-Slots: die Seite heißt "Team von Kuro · Saison 1 · Woche 3" und verlinkt zurück
aufs Match. Ein neues Paste bei jeder Korrektur würde die alte URL mit genau diesem
Titel stehenlassen, während sie ein überholtes Team zeigt. Das Gegenargument, der
Discord-Post verlinke ja noch das alte, greift nicht: `putMessage` in
`src/features/discord-posts/sync.ts` konvergiert und editiert die bestehende Nachricht.
Screenshots, zitierte Links und Embed-Caches zeigen so weiterhin den aktuellen Stand.

Preis: kein Verlauf, was ursprünglich abgegeben wurde. Bewusst in Kauf genommen. Ein
Teamsheet-Streit lautet "sein Team war nicht sein Sheet", nicht "das Sheet wurde
editiert". Eine Historientabelle wäre später rein additiv.

### Warum die Quell-URL nicht gespeichert wird

`source` hält fest, **über welchen Weg** abgegeben wurde (nützlich fürs Debuggen,
etwa wenn VRPaste ausfällt). Die eingegebene URL selbst wird nicht gespeichert. Sie
zeigt auf ein Paste **mit** Stats, und das ist genau der Zustand, den dieses Feature
loswerden soll. Ein gespeicherter Link wäre eine Hintertür zurück auf die Werte, die
wir bewusst nicht halten.

## Reine Logik — `src/features/teamsheets/`

Alles hier ist frei von Datenbank und Netzwerk und wird erschöpfend unit-getestet.

- **`parse.ts`** — `parseTeamsheet(text)` → `{ ok: true, ots, mons }` oder
  `{ ok: false, errors }`. `Team.import`, dann die Regeln von oben, dann Neuaufbau
  jedes Sets aus ausschließlich Spezies/Item/Fähigkeit/Wesen/Attacken und
  `Sets.exportSet`. Fehler sind konkret und benennen das Pokémon:
  "Delphox: Wesen fehlt.", "Das Team braucht genau 6 Pokémon. Gefunden: 5.",
  "Garchomp: mindestens eine Attacke angeben."
- **`normalize.ts`** — Kanonisierung der Spezies: Ist das Item der Mega-Stein dieser
  Spezies, wird die **Basisform** gespeichert (`Delphox-Mega @ Delphoxite` →
  `Delphox @ Delphoxite`). Damit ergeben Pokepaste (schreibt die Mega-Form inline)
  und VRPaste (liefert Basisform plus separaten `megaEvolution`-Block) für dasselbe
  Team byteweise dasselbe OTS. Eine Mega-Form ohne passenden Stein bleibt unverändert.
- **`mega.ts`** — Portierung von `justhit.gg/src/lib/pokepaste.ts#resolveMega`:
  Sprite-Spezies, Anzeigename (immer die Basis), Mega-Fähigkeit; plus Override-Map.
- **`sources.ts`** — `classifyInput(value)` → `pokepaste` | `vrpaste` | `import` |
  `invalid`. Erkennt `pokepast.es` und `vrpastes.com` je mit und ohne `www`, mit
  Trailing Slash, mit `/raw` und `/json`. Alles, was keine URL ist, ist ein Import.
- **`vrpaste.ts`** — `vrpasteToShowdown(json)` → Export-Text. Baut
  `<Spezies> @ <Item>` aus Basisspezies und Item; der `megaEvolution`-Block wird
  ignoriert, weil unsere Mega-Regel ihn beim Rendern ohnehin wieder herleitet.
- **`sprites.ts`** — Bucket-URLs, animiert (`.webp`) und Standbild (`.png`),
  Item-Renders, CDN-Fallback über `@pkmn/img`. Die gehosteten ID-Listen aus
  `justhit.gg/src/data/*.json` werden mitkopiert. Basis-URLs über
  `NEXT_PUBLIC_SPRITE_BASE` / `NEXT_PUBLIC_ITEM_SPRITE_BASE`, Default das
  bestehende `justhit-sprites`-Bucket. Ergänzt `.env.example`.

## Abruf und Validierung — `src/features/teamsheets/actions.ts`

Eine Server Action, von allen Oberflächen benutzt:

```ts
validateTeamsheet({ value: string }): Promise<
  | { ok: true; source: TeamsheetSource; ots: string; mons: MonPreview[] }
  | { ok: false; error: string; details?: string[] }
>
```

`classifyInput` entscheidet den Weg, dann:

- **Pokepaste** → `https://pokepast.es/<id>/raw`, Timeout 8 s.
- **VRPaste** → `https://vrpaste-backend.vercel.app/api/paste/<id>?lang=english`,
  Timeout 8 s. Das ist eine **interne API ohne Zusage**. Fehlschlag, Timeout oder
  unerwartete Antwortform ergeben eine eigene Fehlermeldung, die den Ausweg nennt:
  "VRPaste ist gerade nicht erreichbar. Bitte einen Pokepaste-Link angeben oder das
  Team direkt aus Showdown importieren."
- **Import** → direkt in `parseTeamsheet`.

Die Action ist auf angemeldete Nutzer beschränkt, damit sie kein offener Proxy wird.
`mons` ist eine schlanke Vorschau (Spezies plus Box-Icon) für die Bestätigung im UI.

## Meldeformular — `report-form.tsx`

Über beiden Feldern ein kurzer Hinweis: Pokepaste-Link, VRPaste-Link oder direkter
Import aus Showdown, alle drei gleichwertig.

Pro Spieler-Slot zwei Zustände:

1. **Link** (Start): das bestehende Textfeld plus daneben ein neuer Button
   "Team importieren", der das Modal öffnet. Das Feld validiert **on blur** über
   `validateTeamsheet`; Fehler stehen unter dem Feld, Erfolg zeigt die sechs
   Box-Icons.
2. **Importiert**: Textfeld und Button verschwinden, stattdessen ein Hinweis
   "Teamsheet über Showdown-Import" mit den sechs Icons und einem roten Button
   "Entfernen", der zurück in Zustand 1 führt.

Das **Modal** erklärt kurz, wie man in Showdown exportiert ("Teambuilder → Team →
Import/Export"), hat eine große Textarea und validiert beim Bestätigen sofort. Das
kostet keinen Netzwerkabruf, also gibt es auch keinen Grund, die Rückmeldung bis zum
Absenden aufzuheben — "Bei Delphox fehlt das Wesen" gehört dorthin, wo der Text steht.
Genau deshalb prüfen die Link-Felder ebenfalls früh, on blur, über dieselbe Action:
gleiche Fehler, gleicher Code, beide Wege früh. Bei VRPaste ist das der Moment, in dem
man noch bequem auf einen anderen Weg wechseln kann.

Der Client hält pro Slot das Ergebnis der Validierung (`source` + kanonisches `ots`)
und schickt es mit. `reportMatch` parst und strippt diesen Text **erneut** und
speichert nur das eigene Ergebnis, ist also die Autorität. Ein zweiter Abruf des Links
entfällt. Das ist kein Sicherheitsverlust: wer manipulieren will, nimmt ohnehin den
Import-Weg, und die Quell-URL wird nicht gespeichert, es gibt also keine Behauptung
"das kam von diesem Link", die falsch werden könnte.

## Staff-Editor und Dispute — `result-fields.tsx`

Staff bekommt **keine** Linkfelder. Statt der beiden Inputs zwei Buttons
"Teamsheet bearbeiten", die dasselbe Modal öffnen — mit dem aktuellen OTS
vorbefüllt, egal wie es ursprünglich abgegeben wurde. Damit ist es unerheblich, ob ein
Sheet aus einem Link oder einem Import stammt: für die Korrektur ist es immer Text.

Betroffen: `result-fields.tsx` (die beiden Felder), `result-draft.ts`
(`ResultDraft.teamA`/`teamB` halten künftig OTS statt URL, `NormalEditorInitial` wird
aus `team_sheets` befüllt, `isDraftComplete` und `draftToReport` ziehen nach) und die
beiden Nutzer `staff-result-editor.tsx` und `dispute-resolve-dialog.tsx`.

Löscht eine Dispute-Entscheidung das Ergebnis (`dispute.ts` setzt heute die
Team-URLs auf null), werden die zugehörigen `team_sheets`-Zeilen gelöscht.

## Paste-Seite — `src/app/pastes/[id]/page.tsx`

Server Component, öffentlich, ohne Anmeldung, `robots: noindex`. Unbekannte ID → 404.

- **Titel** "Team von <Name> · Saison <n> · Woche <n>" plus Rücklink auf die
  Match-Seite. Kein Ergebnis, keine Punkte: der Spoiler-Schutz bleibt Sache der
  Match-Ansicht.
- **Sechs Karten**, Aufbau nach `justhit.gg/src/components/TeamPreview.astro`, aber
  mit unseren Tokens (`design/DESIGN.md`: `Tick`, `SectionHead`, `font-heading`,
  `brand-blue`/`brand-orange`, Light und Dark): Sprite mit Item-Icon in der Ecke,
  Anzeigename (bei Megas der Basisname), Item, Fähigkeit mit Mega-Fähigkeit in
  Klammern, die Attacken, das Wesen.
- **Wesen-Pfeile** (grün +SpA / rot −Atk) bleiben. Sie leiten sich aus dem
  Wesensnamen ab, nicht aus EVs, verraten also nichts von dem, was wir strippen.
- **Animations-Schalter** — Standard animiert (`.webp`), Umschalten auf das Standbild
  (`.png`), Wahl in `localStorage`.
- **Kopierbutton** — legt das kanonische OTS in die Zwischenablage.

Hier gibt es **keinen späteren Design-Pass**: die Seite wird direkt fertig
gebaut, mit den Tokens aus `design/DESIGN.md`, für Desktop und Mobil, hell und
dunkel. Die Teamsheet-Sektion im Meldeformular bleibt in der Sprache des
bestehenden Hand-offs (`design/MATCH-REPORTING.md` §6, `go-live/GO-LIVE-POLISH.md`
§1.1): Section-Head, `grid-cols-2`, beschriftete Felder mit grünem Häkchen.

## Anschluss

- **`discord-posts/messages.ts`** — der Teamsheet-Block zeigt unsere URLs. `sync.ts`
  liefert die Sheet-IDs statt der alten Spalten, absolute URL über denselben Helfer
  wie `matchUrl`.
- **`report-summary.tsx`** — die `LinkCard`s zeigen künftig "Teamsheet ansehen ↗"
  statt "pokepast.es ↗".
- **`public-match-view.tsx`** — dasselbe für die öffentliche Ansicht.
- **`queries.ts`** — `getMatchResult` und `groupResults` laden die Sheets mit,
  `saveResult` schreibt sie in derselben Transaktion (Upsert auf `(matchId, playerId)`).

## Dev-Tooling

- **Galerie** (`src/features/dev/components/gallery.tsx`): Paste-Karte in den
  Varianten Mega, ohne Item, drei Attacken; animiert und Standbild; das Import-Modal
  leer, mit Fehlern und bestätigt; der Slot in beiden Zuständen.
- **Seed** (`src/features/dev/seed.ts`): die Platzhalter `https://pokepast.es/seed-a`
  weichen echten `team_sheets`-Zeilen aus zwei eingecheckten Champions-Sheets.
- **`/dev/report-results`** legt beim Melden ebenfalls Sheets an.

## Tests

**Unit, erschöpfend** (`src/features/teamsheets/*.test.ts`):

- `parse.ts` — 5 und 7 Pokémon; fehlende Fähigkeit, fehlendes Wesen, fehlende
  Spezies; 0 und 5 Attacken; Item leer ist gültig; EVs, IVs, Level, Tera, Spitzname,
  Geschlecht, Shiny werden entfernt; CRLF; leerer Text; Müll; Idempotenz
  (parsen → exportieren → parsen ergibt dasselbe).
- `normalize.ts` — Mega-Form inline, Basis plus Stein, Basis ohne Stein, Stein an
  der falschen Spezies, unbekannte Spezies. Beide Quellen ergeben dasselbe OTS.
- `sources.ts` — beide Hosts mit und ohne `www`, `/raw`, `/json`, Trailing Slash,
  `http`, fremde Hosts, Nicht-URLs.
- `vrpaste.ts` — eingecheckte echte Antwort → erwartetes OTS; fehlende Felder;
  `megaEvolution` wird ignoriert.
- `mega.ts`, `sprites.ts` — Bucket-Treffer, Fehltreffer → CDN-Fallback, animiert
  gegen Standbild.

Fixtures sind echte, eingecheckte Antworten beider APIs. **Kein Test geht ins Netz**;
die Fetcher werden injiziert.

**Integration** (`*.integration.test.ts`):

- Upsert auf `(matchId, playerId)` behält die `id` und damit die URL.
- Löschen eines `match_results` kaskadiert auf `team_sheets`.
- Eine Dispute-Entscheidung, die das Ergebnis leert, entfernt die Sheets.
- Ein normales Ergebnis ohne beide Sheets ist nicht speicherbar.

## Verifikation

`npx biome check --write .`, `npx tsc --noEmit`, `npm test -- --run`.

Manuell gegen den lokalen Stack: je ein echter Pokepaste-Link, ein echter
VRPaste-Link und ein direkter Import; ein Sheet ohne Wesen und eines mit 5 Pokémon
müssen mit benennbarem Fehler scheitern; VRPaste-Ausfall simulieren (Basis-URL
verbiegen) und die Ausweichmeldung prüfen; Paste-Seite in Light und Dark, Desktop und
Mobil, Animationsschalter und Kopierbutton; Staff-Korrektur behält die URL; der
Discord-Post zeigt die neuen Links und wird bei Korrektur editiert.

## Lieferung

Ein Feature, ein Commit auf `dev`, Migration im selben Commit. Reihenfolge:
Schema und Migration → reine Logik samt Tests → Action und Abruf → Paste-Seite →
Meldeformular → Staff und Dispute → Anschluss (Discord, Ansichten) → Dev-Tooling →
Checks. Nach Abnahme über einen PR nach `main`.

CLAUDE.md wird ergänzt: neuer Feature-Ordner `teamsheets`, neue Route `/pastes`, die
beiden Sprite-Umgebungsvariablen.

## Entschiedene Fragen

- Genau 6 Pokémon; Item optional; 1 bis 4 Attacken; Fähigkeit und Wesen Pflicht.
  Wesen ist in Champions Teil der OTS-Regeln.
- Terakristall gehört nicht zum Format: vorhanden im Paste ist kein Fehler, es wird
  stillschweigend entfernt. **In der Oberfläche wird das nicht erwähnt.** Ein
  Champions-Paste hat normalerweise gar keinen Tera-Typ, also wäre der Hinweis
  eine Antwort auf eine Frage, die niemand stellt. Der Code entfernt ihn
  trotzdem weiter, für den Fall, dass doch einer auftaucht.
- Keine Legalitätsprüfung von Attacken, Fähigkeiten oder Items.
- Sprites aus dem `justhit-sprites`-Bucket, mit CDN-Fallback und den
  Mega-Regeln von `justhit.gg`.
- Korrektur überschreibt das Paste, die URL bleibt stabil.
- Die Paste-Seite nennt Spieler, Saison und Woche und verlinkt aufs Match.
- Kopierbutton ja.
- Kein Backfill, weil es nichts zu backfillen gibt.
