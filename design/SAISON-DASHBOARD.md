# Buli Hub — Saison-Dashboard & Staff-Ansicht auf Matches (design handoff)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still valid),
`STAFF-BEREICH.md` and `MATCH-REPORTING.md`. This doc is the design pass over
the season-dashboard feature against current `main`: the staff season dashboard
(`saison-dashboard.tsx`, `/staff/saison`) and the staff controls on the match
page (`staff-match-panel.tsx`). Domain logic (`staff-actions.ts`,
`staff-dashboard.ts` bucketing, queries) is correct as-is; **only views
change** — plus the routing change in §1. Reference design: project file
**"Saison-Dashboard (Staff).dc.html"** (1a–1f).

Two structural ideas:

1. **No separate dashboard page.** While the regular season runs, the
   `/staff` page *is* the dashboard — the "Reguläre Saison läuft" card with a
   "Saison-Dashboard öffnen" button disappears, and `/staff/saison` goes away.
   Staff lands on their work, zero clicks in.
2. **The dashboard is a triage list, not a report.** Only what needs action:
   Überfällig → Freewins bestätigen → Diese Woche offen. Free wins are
   confirmed straight from the list; overdue rows carry a quick action into
   the award dialog. Sections without content don't render at all — including
   the current empty **Disputes** placeholder, which is dropped entirely
   (bring the section back when the feature exists).

**Lingo:** the community says **Freewin**, never "Freigewinn". Every UI string
in this feature (and the earlier player-side strings from MATCH-REPORTING.md)
uses **Freewin / Freewins**. Code identifiers (`free_win`, `awardFreeWin`, …)
stay as they are.

---

## 1.–3. Place on `/staff`

The overview, its season line and its stat tiles are described in
`STAFF-DASHBOARD.md` §3. The worklists and the week's matches below (§4–6)
live on the Woche page (`/staff/woche`, `STAFF-DASHBOARD.md` §4); the
overview shows them as todos and numbers.

## 4. Match row (shared row pattern)

Row `flex items-center gap-3.5 rounded-lg border px-4 py-2`, left to right:

- Group tag `w-24 shrink-0 text-xs font-semibold uppercase tracking-[0.06em]
  text-muted-foreground whitespace-nowrap` — **Div {group} · S{round}**
  (shorter than the current `groupName · S{n}`; "Div 1a" reads faster in a
  fixed column).
- Pairing, links to `/match/{id}`: `flex-1 min-w-0 truncate text-sm
  font-medium hover:text-brand-blue dark:hover:text-white` — **{a}
  <span className="text-muted-foreground">vs.</span> {b}**.
- Status chip `shrink-0 rounded-full px-2.5 py-[3px] text-xs font-semibold
  whitespace-nowrap`, flex-centered text (MATCH-REPORTING.md §11):
  - overdue: `bg-destructive/8 text-destructive` — **seit {n} Tagen**
    (days since `endsOn`; concrete age instead of the static "Überfällig"
    label, which already heads the section)
  - open: `bg-muted text-muted-foreground` — **offen**
  - free win: `bg-brand-orange/14 text-brand-blue dark:text-white` —
    **Freewin: {winnerName}**
- Deadline `w-12 shrink-0 text-right text-[13px] text-muted-foreground` —
  `dd.MM.` of `endsOn`.
- Optional trailing action (§5).

Empty note (only "Diese Woche" ever shows one, §6): `rounded-lg border
border-dashed px-4 py-4 text-center text-muted-foreground text-sm`.

Section heads: signature tick + h2 `font-heading text-[22px] font-bold
uppercase tracking-[0.03em]` + count badge `rounded-full bg-muted px-2
py-0.5 text-[12.5px] font-semibold text-muted-foreground tabular-nums`.
Sections stack with `gap-8.5`; **a section with count 0 does not render**
(exception: "Diese Woche", which always renders — §6).

## 5. Sections Überfällig & Freewins bestätigen

**Überfällig** — rows per §4 plus a trailing quick action: outline button
`h-7 rounded-md border bg-background px-2.5 text-[13px] font-medium` —
**Freewin…** — opens the award dialog (§8) directly from the list with the
match preselected. Everything else (double loss, inspection) goes through
the row link to the match page.

**Freewins bestätigen** — the row grows a second line and an inline confirm:

- Line 1: tag + pairing + chip **Freewin: {winner}** + default Button
  (`size="sm"`, h-7) — **Bestätigen**; pending label **…** (existing
  behavior). No page navigation for the 95% case.
- Line 2, indented to the pairing column (`pl-[110px]`): `text-[13px]
  text-muted-foreground truncate` — **"{freeWinReason}" — gemeldet von
  {reporterName}, {reportedAt}** (`de-DE`, weekday short + `dd.MM.`). The
  reason is the decision input; staff must not have to click through to see
  it. Needs `freeWinReason` + reporter + `reportedAt` on `StaffMatchRow`.
- Row link (pairing) still goes to the match page (§7 pending view) for the
  cases where staff wants full context or wants to reject.

## 6. Section Spieltag

- Header row `flex items-center justify-between`: section head **Spieltag
  {n}** (count = open only), a pager to the other Spieltage + text button `text-[13px] font-medium
  text-muted-foreground hover:text-brand-blue dark:hover:text-white` —
  **Alle anzeigen ({total})** / toggled: **Nur offene**. Default shows open
  matches only (the current component's `weekOpen` default — keep it).
- Toggled-on reported rows: chip `bg-muted text-muted-foreground` with the
  score — **2:1 {winnerName}** — row at `opacity-60`.
- All-clear state (everything reported, nothing overdue, no free wins): the
  two other sections are gone (§4); above "Diese Woche offen" render an
  all-clear band `flex items-center gap-4 rounded-lg border border-dashed
  px-6 py-5`: big tick `h-2.5 w-5 -skew-x-[18deg] bg-brand-orange` +
  `font-heading font-bold text-xl uppercase text-brand-blue dark:text-white`
  **Alles erledigt** over `text-[13.5px] text-muted-foreground` — **Alle
  {n} Matches dieser Woche sind gemeldet, nichts ist überfällig, keine
  Freewins offen.**

## 7. Staff zone on the match page (`staff-match-panel.tsx`, `match/[matchId]/page.tsx`)

- For staff viewers, the back link at the top of the page goes to
  `/staff` — **← Staff-Bereich** — not to `/spieler` (participants keep
  their link; a staff member who is also the participant gets the player
  link). Style per MATCH-REPORTING.md §1.
- Panel: `mt-9 rounded-xl border border-brand-blue/25 bg-brand-blue/[0.03]
  px-6 pt-5 pb-2`. Head: **navy** tick `h-2 w-4 -skew-x-[18deg]
  bg-brand-blue dark:bg-white` + h2 `font-heading text-xl font-bold
  uppercase tracking-[0.03em] text-brand-blue dark:text-white` —
  **Staff-Aktionen**. Navy is the officiating color; player-facing accents
  stay orange.
- Under the head, one context sentence `text-[13.5px] text-muted-foreground`
  (varies by state, below). Then **action rows** instead of a bare button
  cluster — each `flex items-center justify-between gap-4 border-t
  border-brand-blue/10 py-3.5`: left column title `text-sm font-semibold` +
  consequence line `text-[13px] text-muted-foreground`; right the button.
  Buttons that open a dialog end their label with `…`.

State → rows (render only what applies, in this order):

- **No result** — context: "Spieler melden Ergebnisse selbst. Staff greift
  ein, wenn ein Match nicht zustande kommt."
  1. **Freewin vergeben** / "Ein Spieler erhält den Sieg. Begründung
     erforderlich — sofort gewertet." / outline **Vergeben…** → §8
  2. **Doppelniederlage vergeben** / "Beide Spieler erhalten eine
     Niederlage, niemand einen Sieg." / outline **Vergeben…** → confirm
     dialog (existing copy, s/Freigewinn/Freewin/)
  If overdue, the page shows a status card above the panel (`rounded-lg
  border px-4.5 py-3.5 flex items-center gap-3`): chip **seit {n} Tagen
  überfällig** (§4 overdue chip) + `text-sm text-muted-foreground` "Noch
  kein Ergebnis gemeldet."
- **Pending free win** — context: "Der Freewin zählt erst nach Bestätigung
  für die Tabelle." Above the panel, the pending summary per
  MATCH-REPORTING.md §10.
  1. **Freewin bestätigen** / "Sieg für {winner} wird gewertet." /
     **default Button** (the only primary in the whole zone) — **Bestätigen**
  2. **Zurückweisen** / "Meldung wird gelöscht, das Match kann neu gemeldet
     werden." / outline **Zurückweisen…** → confirm dialog. This is
     `reopenMatch` renamed for this state — same action, but in the
     vocabulary of the decision being made.
- **Result reported** — context: "Eingriffe überschreiben bzw. löschen das
  gemeldete Ergebnis."
  1. **Ergebnis zurücksetzen** / "Löscht das Ergebnis — das Match kann neu
     gemeldet werden." / outline with destructive accent
     (`border-destructive/35 text-destructive`) — **Zurücksetzen…** →
     confirm dialog (existing)
  2. **Freewin vergeben** / "Überschreibt das gemeldete Ergebnis.
     Begründung erforderlich." / outline **Vergeben…** → §8
  3. **Doppelniederlage vergeben** / "Überschreibt das gemeldete Ergebnis —
     beide verlieren." / outline **Vergeben…** → confirm dialog
- Errors: `text-destructive text-sm` at the bottom of the panel (existing).

## 8. Award-Freewin dialog (shared)

Used from the match page (§7) and from overdue dashboard rows (§5) — one
component, receives the match. `DialogContent` width ~480px.

- `DialogTitle` **Freewin vergeben**; `DialogDescription` names the match:
  **{a} vs. {b} · Spieltag {n} · Division {group}. Wird sofort gewertet und
  überschreibt ein bestehendes Ergebnis.**
- **Gewinner** — the `Select` becomes two tappable player cards
  (`grid grid-cols-2 gap-2.5`), same pick pattern as the player-side free
  win (MATCH-REPORTING.md §8): avatar `size-[30px]` + name; selected card
  `border-2 border-brand-orange` + trailing orange tick, unselected
  `border bg-background`.
- **Begründung** — `Textarea rows-3`, placeholder "z. B. {b} hat auf keine
  Terminanfrage reagiert." Helper line under it `text-[12.5px]
  text-muted-foreground`: **Sichtbar für beide Spieler auf der
  Match-Seite.** — the reason is public, say so before it's written.
- Footer: outline **Abbrechen** + default Button that names the winner —
  **Freewin an {winner} vergeben** — disabled until winner + reason are set;
  pending **Wird vergeben…**.

## 9. Dark mode & details

- Everything resolves via tokens; the staff zone tint `bg-brand-blue/[0.03]`
  needs a dark check — fall back to `dark:bg-muted/20` if it vanishes.
- All chips: `whitespace-nowrap`, flex-centered text, `leading-none`
  (MATCH-REPORTING.md §11 applies throughout).
- All counts/scores/deadlines `tabular-nums`.
- Keep `data-comment-anchor` attributes if any land on these sections.
