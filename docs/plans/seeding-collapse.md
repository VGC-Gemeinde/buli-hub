# Seeding: Sektionen einklappen

**Status: done** (2026-07-10)

Im Einteilungs-Sheet lassen sich „Nicht platziert", Divisionen und
Sub-Divisionen (Gruppen) einklappen, damit Staff bei 100+ Spielern den
Überblick behält.

- **Logik pur in `sheet.ts`:** `assembleSheetRows` nimmt `collapsedIds`
  (Division-/Sub-Division-Ids plus der Sentinel `UNPLACED_SECTION`);
  eingeklappte Sektionen behalten ihren Separator (Flag `collapsed`, Zähler
  bleiben), ihre Inhaltszeilen entfallen. Eine Division klappt alles unter
  ihr zu (Gruppen, „Ohne Gruppe", Leer-Hinweis); eine Gruppe bzw. „Nicht
  platziert" nur die eigenen Spieler. **Eine aktive Suche hebt das
  Einklappen auf**, damit Treffer nie unsichtbar sind (die Status-Pills
  allein nicht). Unit-getestet in `sheet.test.ts`.
- **UI:** Chevron-Toggle im Titelbereich der Separatoren (`aria-expanded`);
  der „Gruppen generieren"-Button bleibt davon getrennt. Separatoren bleiben
  Drop-Ziele — auf eine eingeklappte Sektion kann weiterhin gedroppt werden.
- Zustand lokal pro Betrachter (`SeedingWorkspace`), nicht geteilt oder
  persistiert. Gallery zeigt ein eingeklapptes Specimen.
