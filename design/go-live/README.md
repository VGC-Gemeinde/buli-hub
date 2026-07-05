# Go-Live-Polish — Handoff-Bundle

Für den implementierenden Agenten (Claude Code). In dieser Reihenfolge lesen:

1. **GO-LIVE-POLISH.md** — die Spezifikation. Prioritäten, Brand-Regeln,
   alle Tickets, Checkliste. Einstiegspunkt.
2. **Die `.dc.html`-Dateien** — die normativen Design-Referenzen, eine pro
   View (Zuordnung: GO-LIVE-POLISH.md §12). So liest man sie:
   - Markup zwischen `<x-dc>…</x-dc>`: exakte Werte stehen in den
     Inline-Styles (px, oklch-Farben, Radien, Gewichte). Diese Werte sind
     verbindlich — in Tailwind-Utilities bzw. Tokens übersetzen, nicht
     schätzen.
   - `<script data-dc-script>`: die `Component`-Klasse beschreibt Zustände,
     Interaktionen und abgeleitete Werte (z. B. Zonen-Logik, Balance-Check,
     Validierung). `data-props` listet alle Zustände, die die View haben
     kann — jeder ist umzusetzen.
   - `<sc-if>` / `<sc-for>` = bedingtes Rendern / Listen.
   - Zum Ansehen im Browser: Datei direkt öffnen (support.js + logo.svg
     liegen bei). Nicht nötig fürs Implementieren — der Quelltext genügt.
3. **Polish-Katalog.dc.html** — dieselbe Spec als browsbares Dokument;
   nützlich als Übersicht, inhaltlich deckungsgleich mit der MD.

## Nicht wörtlich kopieren

Die `.dc.html` sind Desktop-Referenzen (1280px+) **ohne responsive
Verhalten** und nutzen Inline-Styles statt der Projekt-Konventionen.
Umsetzung immer als idiomatischer Projekt-Code: shadcn-Komponenten,
Tailwind-Tokens (`bg-primary`, `text-muted-foreground`, …), bestehende
Datei-/Feature-Struktur. Mobile-Adaption ist Teil jedes Tickets
(GO-LIVE-POLISH.md §6).

## Ablage im Repo

Diesen Ordner als `design/golive/` (o. ä.) ins Repo committen, damit
Spec und Referenzen versioniert neben dem Code liegen — wie die früheren
Handoffs in `design/`.
