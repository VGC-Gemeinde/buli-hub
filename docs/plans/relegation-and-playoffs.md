# Relegation und Playoffs

**Status: gebaut**, offen sind:

- der Satz im Regelwerk zu Gleichständen ab drei Spielern, sobald die Liga
  den Wortlaut freigibt ([unten](#gleichstand-ab-drei-spielern-an-einer-grenze));
- der Design-Durchgang der übrigen Ansichten: Relegation, Dashboard-Hero
  und die Staff-Karten sind im ersten Durchgang. Die Playoffs sind fertig
  gestaltet: Bracket mit Spaltenköpfen (Runde, Woche, Daten) und
  Verbindungslinien, Karten mit Kopfzeile, Herkunft unter dem Namen und
  Sieger-Schiene, am Handy die Runden untereinander. `design/PLAYOFFS.md`
  stammt aus der Zeit mit Oberbegriff und gilt nicht mehr.

Pro Slice ein Plan, siehe [Slices](#slices).

Was nach dem letzten regulären Spieltag passiert: Gleichstände an
Zonengrenzen werden in Tiebreakern entschieden, die Relegation tauscht
Spieler zwischen benachbarten Divisionen, die Playoffs der Division 1
entscheiden den Meister. Dieses Dokument ist die gemeinsame Regelgrundlage;
jede Slice hat ihren eigenen kurzen Plan (`relegation-and-playoffs-<n>-*.md`),
der hierauf verweist.

Baut auf [[post-season-setup]] und [[championship-playoff]] auf: Die Zonen
pro Division (direkter Auf-/Abstieg, Relegationsplätze, Playoff-Plätze,
maßgebliche Tabelle) werden bei der Einteilung konfiguriert und hier nur
gelesen.

## Begriffe

- **Saison:** die ganze Einheit, vom ersten Spieltag bis zum gespielten
  Playoff-Finale.
- **Reguläre Saison:** der Teil mit dem generierten Spielplan (die
  Spieltage).
- **Tiebreaker:** gehören zur regulären Saison. Sie entscheiden geteilte
  Plätze ihrer Tabelle, wenn durch den geteilten Platz eine Zonengrenze läuft.
- **Relegation:** je ein Bo3 zwischen den Relegationsplätzen zweier
  benachbarter Divisionen; der Sieger spielt nächste Saison oben.
- **Playoffs:** das K.-o.-Bracket der Division 1 um den Titel "Meister
  Saison N".

Relegation und Playoffs sind zwei getrennte Dinge, in der UI wie im Code
(`src/features/relegation/`, `src/features/playoffs/`). Es gibt keinen
Oberbegriff, weder für Spieler noch für Staff. Gemeinsam haben sie nur ihre
Wochen und den Ablauf, in dem sie entstehen. Im Code tragen Matches ihre Art
in `matches.stage` (`regular | tiebreaker | relegation | playoff`).

Ein Ergebnis, das der Hub der Öffentlichkeit absichtlich noch nicht zeigt
(Aufnahme für den Stream, Match of the Week ohne VOD), heißt im Text
"zurückgehalten"; `embargo` ist nur der Code-Name.

## Tabellenplätze, Sitze und Los

**Platzfolge.** Maßgeblich ist die Tabelle, die die Einteilung pro Division
festlegt: jede Gruppentabelle (Gruppenmodus) oder die Divisionstabelle
(Gesamttabellen-Modus). Ihre Reihenfolge ist die der Tabelle
(`computeStandings`), mit einer Änderung: Gedroppte Spieler stehen hinter
allen anderen. Die Zonen folgen positional daraus (`assignZones`).

**Gleichstände.** Spieler mit demselben Rang (und ohne Drop) bilden einen
Block.

- Liegt der Block innerhalb einer Zone, entscheidet die Losnummer der Spieler
  über die Reihenfolge im Block.
- Läuft eine Zonengrenze durch den Block, gibt es bei zwei Spielern einen
  **Tiebreaker**, bei drei oder mehr eine **Staff-Reihenfolge**
  (siehe unten).
- Gedroppte Spieler bilden nie einen Gleichstand an einer Grenze; unter ihnen
  entscheidet die Losnummer.

**Sitz.** Ein Platz in einer Zone, die gespielt wird (Playoffs,
Aufstiegs-Relegation, Abstiegs-Relegation), ist ein Sitz: Tabelle plus
Position in ihrer Zone ("Division 2a, Platz 7"). Gepaart wird zwischen
Sitzen, nicht zwischen Spielern. Wer einen Sitz hält, sagt die Tabelle, bei
einem Gleichstand an einer Grenze der Tiebreaker bzw. die Staff-Reihenfolge.
Die Paarungen hängen damit nicht vom Ausgang der Tiebreaker ab, nur ihre
Besetzung.

**Losnummern.** Zwei Zufallszahlen, von Postgres gezogen
(`double precision not null default random()`), nie sichtbar, nie neu
gezogen, von keiner Aktion änderbar:

- `placements.lot_number`: ordnet Spieler mit demselben Rang innerhalb einer
  Tabelle (Gleichstand innerhalb einer Zone, Gedroppte untereinander).
- `sub_divisions.lot_number`: ordnet gleich gute Sitze aus verschiedenen
  Gruppen (Gruppenmodus). Sie hängt am Sitz, nicht am Spieler; sonst würde
  der Ausgang eines Tiebreakers, der einen Sitz besetzt, die Paarung
  verschieben.

Die Migration, die die Spalten anlegt, zieht die Nummern für die laufende
Saison; jede neue Zeile bekommt ihre beim Anlegen. Bis zur Finalisierung der
Einteilung können Zeilen neu entstehen und damit neu ziehen; das ist
harmlos, weil die Nummern dann nichts bewirken.

Die Paarungen sind eine pure Funktion aus Tabelle und Losnummern. Eine
Korrektur ändert sie beim nächsten Lesen; es gibt keine gespeicherte
Auslosung, die veralten könnte.

## Relegation

- An jeder Grenze zwischen Division t und t+1: oberer Topf = die
  Abstiegs-Relegations-Sitze von t, sortiert vom schlechtesten aufwärts;
  unterer Topf = die Aufstiegs-Relegations-Sitze von t+1, sortiert vom
  besten abwärts. Gleich gute Sitze ordnet die Gruppen-Losnummer. Gepaart
  wird der Reihe nach (bester Aufsteiger gegen schlechtesten Absteiger).
- Je Paarung ein Bo3 in Woche 1. Replay-Pflicht nach der Regel der oberen
  Division.
- Unterstützt wird nur eine Relegation, die an jeder Grenze aufgeht (gleich
  viele Sitze oben und unten). Die Einteilung lässt sich anders nicht
  finalisieren (`relegation_unbalanced` in `validatePostSeason`).
- Eine Grenze heißt "Division 1 und 2".

## Playoffs (Division 1)

- Single-Elimination, Bo3, kein Spiel um Platz 3, eine Runde pro Woche.
- Teilnehmer: die Playoff-Sitze der Division 1.
- **Setznummern nach Platz:** Bessere Position in der Zone heißt bessere
  Setznummer, unabhängig von der Gruppe (alle Gruppenersten vor allen
  Zweiten); gleich gute Sitze ordnet die Gruppen-Losnummer.
- **Bracket:** aufgefüllt auf die nächste Zweierpotenz; die fehlenden
  Setznummern sind Freilose, also bekommen die besten Setznummern ein
  Freilos. Standardreihenfolge (1 und 2 treffen sich frühestens im Finale).
- **Gruppentrennung** (nur Gruppenmodus): In Runde 1 trifft niemand auf die
  eigene Gruppe. Unter den gleich guten Sitzen wird dafür von der
  Losreihenfolge so wenig wie nötig abgewichen (die erste gültige Zuordnung
  in Losreihenfolge). Gibt es keine, meldet die Vorschau es; mit gleich
  vielen Plätzen pro Gruppe ließ sich kein solcher Fall konstruieren.
- Rundennamen: Finale, Halbfinale, Viertelfinale, Achtelfinale; die Matches
  einer Runde heißen "VF 1", "HF 2" usw.

## Ablauf

Wie beim Saisonstart in zwei Schritten.

1. **Spielplan für Relegation und Playoffs erstellen** (Staff, sobald der
   Termin feststeht, frühestens nach Veröffentlichung des regulären
   Spielplans). Eingabe und Rechenweg wie beim regulären Spielplan
   (`schedule/spieltage.ts`): eine Deadline pro Woche, Verschieben einer
   Woche schiebt die folgenden mit, Standard ab dem ersten Sonntag
   mindestens 7 Tage nach dem letzten Spieltag. Woche 1 beginnt am Tag nach
   dem letzten Spieltag. Die Zahl der Wochen ist die Zahl der Bracket-Runden,
   mindestens eine. Endgültig, mit Eintippen. Legt die Wochen als weitere
   Runden an (`matchdays.regular = false`) und alle Relegations- und
   Playoff-Matches mit Sitz bzw. Herkunft statt Spielern. Freilos-Paarungen
   der ersten Runde werden nicht angelegt.
2. **Relegation und Playoffs veröffentlichen** (Staff, nach dem letzten
   Spieltag). Ein Klick friert die Ergebnisse der regulären Saison ein, legt
   die Tiebreaker an (Woche 1), schreibt die Besetzung in die Matches und
   macht alles öffentlich. Die Folge steht am Knopf, als erster Satz im
   Dialog, und das Eintippwort nennt sie: "Reguläre Saison abschließen".
3. **Saison abschließen** (Staff, nach dem Finale), siehe unten.

Tiebreaker laufen parallel zu Woche 1. Ein Match, dessen Sitz auf einen
Tiebreaker oder eine Staff-Reihenfolge wartet, zeigt das.

## Vorschau und Geheimhaltung

- Ab dem Erstellen zeigt der Hub Staff Relegation und Playoffs mit der
  Besetzung nach dem aktuellen Stand der Tabelle ("Stand jetzt"); ein Sitz
  mit offenem Gleichstand zeigt die Kandidaten ("Alice oder Bob").
- **Vor der Veröffentlichung erreicht keine Spur einer Relegations- oder
  Playoff-Paarung einen Spieler:** kein Dashboard, Profil, Favoriten,
  Match-Seite (für Nicht-Staff nicht gefunden), Discord, Stream-API,
  Stream-Foto-Angebot. Die Spieler-Spalten der Matches bleiben bis dahin leer,
  sodass Abfragen nach Spieler strukturell nichts finden. Jede Abfrage, die
  diese Matches sehen soll, prüft die Veröffentlichung.
- **Match of the Week** ist ab dem Erstellen nominierbar, im gewohnten Ablauf:
  Die neuen Wochen erscheinen in der Auswahl, auch mit offener Besetzung
  ("Alice oder Bob gegen Charlie oder Dora"). Tiebreaker sind erst nach der
  Veröffentlichung nominierbar. Eine Kandidatur merkt sich die Besetzung bei
  der Nominierung; weicht die aktuelle ab, zeigt der MotW-Workspace
  "Besetzung geändert" und es gibt ein Staff-Todo. Das Stream-Foto-Angebot
  kommt erst mit der Veröffentlichung.

## Veröffentlichen

**Voraussetzungen:** Letzter Spieltag vorbei · jedes reguläre Match hat ein
Ergebnis · kein offener Dispute · kein unbestätigter Freewin · keine Aufnahme
hält ein reguläres Ergebnis zurück · kein bestätigtes MotW ohne VOD · kein
offenes Ersatzspieler-Angebot (Staff ziehen es zurück, `withdrawReplacement`).
Die Prüfliste verlinkt jeden offenen Punkt.

**Danach gesperrt (reguläre Matches):**

- Ergebnisse: `reportMatch`, `openDispute`, `decideDispute`,
  `confirmFreeWin`, `editResult` (damit auch Teamsheet-Korrekturen),
  `reopenMatch`, `awardFreeWin`, `awardDoubleLoss`.
- Sichtbarkeit: `holdMatch`; `nominateMotwCandidate`, `dropMotwCandidate`,
  `confirmMotw`, `revokeMotw` für reguläre Spieltage.
- Spieler: `dropPlayer`, `undropPlayer`, `offerReplacement`,
  `acceptReplacement`.
- Erlaubt bleiben `releaseHold`, `saveMotwYoutubeUrl`,
  `withdrawReplacement`, Bans und alles ohne Wirkung auf die Saison.
- Durchsetzung: eine Prüfung im Write-Layer (die Ergebnis-Schreibfunktionen
  in `reporting/queries.ts`, dazu eine gemeinsame
  `regularSeasonClosed(windowId)` für Drop, Ersatzspieler, Hold und MotW),
  ein Postgres-Trigger als Sicherheitsnetz, die UI liest dieselbe Funktion
  (die Match-Seite zeigt "Ergebnis endgültig"), ein Integrationstest pro
  Aktion.

## Gleichstand ab drei Spielern an einer Grenze

Kein Format im Hub. Staff spielen ein Tiebreaker-Turnier ihrer Wahl
außerhalb des Hubs und tragen das Ergebnis als Reihenfolge ein, mit
Begründung. Eingetragen wird erst nach dem Veröffentlichen (die Tabelle ist
dann eingefroren, die Reihenfolge kann nicht veralten); bis dahin warten die
betroffenen Sitze wie bei einem offenen Tiebreaker, die Vorschau zeigt
"Staff-Entscheidung nach Veröffentlichung". Ändern lässt sich die
Reihenfolge nach der allgemeinen Regel unten. Das Regelwerk bekommt im
Callout "Greift kein Tiebreaker" einen Satz, sobald die Liga den Wortlaut
freigibt (Vorschlag: "Bei drei oder mehr Spielern auf einem solchen Platz
legt das Staff-Team das Format der Tie-Breaker-Matches fest.").

## Freewin, Drop, Doppelniederlage

Gelten für Tiebreaker, Relegation und Playoffs gleichermaßen und wirken nie
auf die reguläre Tabelle.

- **Freewin:** wie in der Saison (beanspruchen, bestätigen, vergeben); zählt
  als Sieg.
- **Drop:** wirkt nur auf Matches ohne Ergebnis: offene und künftige zählen
  als Freewin für den Gegner, sind beide gedroppt, als Doppelniederlage.
  Gespielte Matches bleiben. Der Spieler behält seinen Platz in der Tabelle.
  Möglich nur für Spieler mit einem offenen Tiebreaker-, Relegations- oder
  Playoff-Match. Eigenes Feld, nicht `placements.dropped_at` (das schiebt in
  jeder Tabelle ans Ende). Wer in der regulären Saison gedroppt wurde, ist
  es auch hier: Seine Matches zählen für den Gegner.
- **Doppelniederlage:** Beide bekommen den schlechtesten Ausgang, zu dem das
  Match führen konnte. Jeder Sitz, den das Match besetzen sollte, bleibt
  leer; wer gegen einen leeren Sitz spielt, gewinnt kampflos.
  - Playoffs: beide scheiden aus; im Finale gibt es keinen Meister.
  - Relegation: oben steigt ab, unten bleibt; die obere Division ist nächste
    Saison um einen Platz kleiner (regelt die nächste Einteilung).
  - Tiebreaker:

    | Grenze (besser / schlechter) | Beide bekommen | Leer bleibt |
    |---|---|---|
    | Playoffs / nichts | nicht in den Playoffs | der Bracket-Sitz |
    | direkter Aufstieg / Relegation | bleiben | Aufstiegsplatz und Relegationssitz |
    | Relegation / nichts | bleiben | der Relegationssitz |
    | nichts / Relegation | steigen ab | der Relegationssitz |
    | Relegation / direkter Abstieg | steigen ab | der Relegationssitz |
    | direkter Aufstieg / nichts | bleiben | ein Aufsteiger weniger |
    | nichts / direkter Abstieg | steigen ab | ein Absteiger mehr |

  Sind beide Sitze eines Matches leer, gilt es wie eine Doppelniederlage.
- **Eine Regel für alle Änderungen** (Ergebnis, Freewin, Doppelniederlage,
  Drop und dessen Rücknahme, Korrektur, Dispute-Entscheidung,
  Staff-Reihenfolge): abgelehnt, wenn sie den Ausgang eines Matches ändert
  und ein darauf aufbauendes Match (auch durch kampflose hindurch) ein
  Ergebnis hat. Sonst passt sich die Besetzung der Folge-Matches an.

## Zurückgehaltene Ergebnisse

- **Melden:** Ein Match, dessen Besetzung aus einem zurückgehaltenen Ergebnis
  stammt, bekommt kein Ergebnis (Meldung, Freewin-Anspruch, Staff-Werkzeuge),
  außer es ist selbst zum Zurückhalten markiert.
- **Freigeben:** erst, wenn das Ergebnis, auf dem es aufbaut, freigegeben
  ist. Das gilt auch für das Eintragen eines MotW-VODs ("Erst HF 1
  freigeben").
- **Sichtbarkeit:** Die Spieler eines Matches sehen immer ihren Gegner; alle
  anderen sehen "Sieger HF 1", bis das Ergebnis freigegeben ist. Alles, was
  den Sieger eines zurückgehaltenen Matches nennen würde (Folge-Match,
  kampfloser Ausgang, Final-Banner), zeigt den Platzhalter.
- **Todo:** Beginnt die Woche des Folge-Matches und das vorige ist noch
  zurückgehalten, wird das Aufnahmen-Todo rot.

## Discord

- **Ergebnis-Posts:** Kopfzeile mit Stufe statt "Spieltag N" ("Relegation ·
  Division 1 und 2", "Playoffs · Halbfinale", "Tiebreaker · Division 2a").
  Channel per `resultChannelFor` mit der höheren Division der beiden Spieler.
  Nichts vor der Veröffentlichung, nichts Zurückgehaltenes vor der Freigabe.
- **Zwei Chat-Channels mit je einer Rolle:** Rollen "Playoffs" und
  "Relegation", Channels `💬-playoffs-chat-💬` und `💬-relegation-chat-💬`.
  Angelegt und konvergiert von der bestehenden Season-Sync ab der
  Veröffentlichung; die Rolle bekommt jeder mit einem Match der Stufe.
  Getrackt in `discord_season_resources` (pro Saison, nicht pro Gruppe);
  bleiben bis zum späteren Aufräumen nach der Saison. Tiebreaker sprechen
  sich im Gruppen-Channel ab.

## Saison abschließen

- Staff-Klick "Saison abschließen", nur Eintippen ("Saison abschließen"),
  keine Fakten im Dialog. Möglich, sobald alles entschieden ist: jedes
  Tiebreaker-, Relegations- und Playoff-Match hat ein Ergebnis, keine
  Disputes, keine unbestätigten Freewins, jede Staff-Reihenfolge eingetragen,
  nichts zurückgehalten (auch nicht das Finale). Das Todo erscheint, sobald
  es möglich ist.
- Danach ist die Saison zu Ende: dieselbe Sperre wie beim Veröffentlichen,
  auf alle Matches erweitert. Die Seiten bleiben als Archiv.
- Schreibt pro Spieler `promoted | stays | demoted` auf `placements` fest,
  dazu den Meister. Bis dahin leitet der Hub das Ergebnis live ab (pure
  Funktion). Keine Korrektur pro Spieler.

## Match of the Week und das Finale

Der MotW-Banner der Liga-Übersicht zeigt auch nach der regulären Saison das
zuletzt bestätigte Match of the Week, egal aus welcher Stufe: statt
"Spieltag 3 · Division 1a" steht dann "Woche 1 · Relegation · Division 1 und
2". Ist das gezeigte Match das Finale, wird der Banner zu seiner
Final-Variante: Gold statt Orange, Pokal und "Finale" als Titel, und nach
dem Aufdecken trägt der Sieger "Meister Saison n", die andere Seite tritt
zurück. VOD, Zurückhalten und Spoiler-Schutz wie bei jedem MotW. Weil ein
MotW erst nach seiner Woche bestätigt wird, erscheint die Final-Variante
erst nach dem Finale. Eine eigene Meister-Karte gibt es nicht; `/playoffs`
und die Staff-Seite zeigen das Bracket, in dem der Sieger des Finales
markiert ist.

## Lokal durchspielen

Drei Stände unter `/dev` (`src/features/dev/seed.ts`), die Persona führt
jeweils eine Gruppe der Division 1 an:

- "Vorletzter Spieltag läuft" (`generateLateRegularSeasonSeed`): Spielplan
  für Relegation und Playoffs noch nicht erstellt, Ergebnisse teils offen,
  ein Match noch für eine Aufnahme zurückgehalten. Für "Spielplan
  erstellen", die Vorschau "Stand jetzt" und die Prüfliste; veröffentlichen
  lässt sich hier nicht, der letzte Spieltag liegt in der Zukunft.
- "Nach dem letzten Spieltag" (`generateAfterSeasonSeed`): alles gespielt,
  Spielplan erstellt, nicht veröffentlicht, keine Gleichstände.
- "Nach dem letzten Spieltag, mit Gleichständen" (`ties`): dazu Division 1a
  Platz 2/3 und Division 2a Platz 1/2 (Tiebreaker) und Division 3a Platz 6
  bis 8 (Staff-Reihenfolge).

Die regulären Ergebnisse sind deterministisch (in jeder Gruppe gewinnt der
Bessere, 2:0 oder 2:1 je nach Gruppe), Gleichstände gibt es nur, wo sie
geplant sind. Nach dem Veröffentlichen meldet "Alle offenen Ergebnisse
melden" die offenen Tiebreaker-, Relegations- und Playoff-Matches und
schreibt die Besetzung der Folge-Matches nach; ein weiterer Aufruf meldet
die nächste Runde. Zum Schluss "Saison abschließen".

## Slices

Slices 2 bis 7 gehen zusammen in Produktion, weil der Knopf alles
veröffentlicht und die Ansichten den Bracket-Fortschritt und das
Saisonergebnis zeigen. Gebaut wurde 1, 2, 3a, 3b, 6, 7, 4a, 4b (mit 3c), 5, 8.

1. **Spielplan und Vorschau** (`relegation-and-playoffs-1-schedule.md`):
   Schema-Grundlage, Losnummern, pure Sitz-/Paarungs-/Bracket-Logik,
   "Spielplan erstellen", Staff-Vorschau, `relegation_unbalanced`. Nichts
   öffentlich.
2. **Match of the Week in den neuen Wochen**
   (`relegation-and-playoffs-2-motw.md`): Nominierung mit offener Besetzung,
   "Besetzung geändert".
3. **Veröffentlichen und erste Woche**, in drei Teilen:
   3a Veröffentlichen und die Sperre (`relegation-and-playoffs-3a-publish.md`);
   3b Spielen: Melden aller Matches mit Sitzen aus der Tabelle,
   Nachrücken nach Tiebreakern, Korrektur-Schutz, Freewin/Drop/
   Doppelniederlage, Zurückgehaltenes zwischen Tiebreaker und Sitz,
   Match-Seite; 3c Dashboard-Hero und Aufnahmen-Workspace für diese Matches.
4. **Öffentliche Seiten**, in zwei Teilen: 4a `/playoffs`, `/relegation`,
   Liga-Zeile (`relegation-and-playoffs-4a-public-pages.md`); 4b Übersicht,
   Tiebreaker in der Divisionsansicht, Dashboard-Hero, Aufnahmen
   (`relegation-and-playoffs-4b-overview-dashboard.md`).
5. **Discord** (`relegation-and-playoffs-5-discord.md`): Kopfzeilen,
   Routing, zwei Chat-Channels mit Rollen.
6. **Bracket-Fortschritt** (`relegation-and-playoffs-6-bracket.md`):
   Folge-Matches füllen, Ketten, Korrektur-Schutz entlang der Ketten,
   Freigabe-Reihenfolge, kein Meister. Vor den Ansichten gebaut.
7. **Saison abschließen** (`relegation-and-playoffs-7-complete.md`). Vor den
   Ansichten gebaut.
8. **Stream-API** (`relegation-and-playoffs-8-stream-api.md`): Stufe,
   Wochen- und Rundenname, weiterlaufende Bilanz; Gegenstück in
   `../gemeinde-streams`.
