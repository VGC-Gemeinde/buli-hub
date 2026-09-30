# Spieler-Dashboard auf einen Blick

**Status: done** (2026-09-30): verified by screenshots at 1440 × 900 and
1280 × 800 (group and division mode, with the profile hint), on a phone, and
in dark mode.

The first of the dashboard reworks. The rule for every dashboard: what a user
needs week by week is visible at once, on desktop without scrolling (mobile
stacks and scrolls, by nature). The Staff-Bereich follows as its own plan.

No designer hand-off follows: the views are built final. `design/SPIELER-
DASHBOARD.md` is updated to describe the result, so a later reader does not
find the old layout there.

## What stays

Top to bottom, unchanged in order and substance:

1. The profile hint (dismissible).
2. "Deine Saison", full width: division and group, Saison, the progress strip
   with the Spieltag.
3. The current match (hero).
4. Two columns: Spielplan left, Tabelle right.

## What changes

### 1. The Regelwerk card leaves the dashboard

It makes the right column the longest thing on the page, and nobody needs it
week by week. The Regelwerk stays reachable from the header, the footer, the
gate after changes, and the Discord. `RegelwerkCard` is deleted with its
gallery specimen; it is used nowhere else.

### 2. Spielplan and Tabelle share one anatomy

Today the headings line up but the content does not: the Tabelle has an
explanation (and in division mode the group/division switch) above it, the
Spielplan has nothing. Both columns become the same three layers, so their
first rows sit on the same line:

- **Section header** (title, right meta). Spielplan: "7 Spieltage". Tabelle:
  the group, or in division mode the switch between group and division
  table, which moves up into the meta slot.
- **One card with a header row**, then rows. The Spielplan turns from separate
  bordered cards into rows of one card, with a header row (Spt., Gegner,
  Ergebnis) at the height of the table's header row. Row height matches the
  table rows. The row states stay: current Spieltag orange, overdue red, bye
  muted, "Vor deinem Einstieg" dashed.
- **Footnotes under the card**, never above: for the Tabelle the zone legend
  and the one line that says which table decides ("Auf- und Abstieg wird in
  deiner Gruppe entschieden", or the division variant), plus the withheld
  results note; the Spielplan has none.

The shared `StandingsTable` keeps its look, so the public overview and the
profile do not change; the Spielplan is fitted to it.

### 3. Division tables

A group table (8 rows) fits beside the Spielplan (7 rows). A division table
does not: 16 rows for two groups, 40 for Division 4 with five. It is shown at
full length anyway, and in division mode the page scrolls again: every row of
the table that decides promotion and relegation stays in plain sight, and
that is worth more than the fold. The "everything at once" target below holds
for group mode.

### 4. Vertical budget

Target (group mode): 1440 × 900 shows everything down to the last table row,
profile hint dismissed; 1280 × 800 at most the last rows below the fold. Where the space
comes from:

- The profile hint takes its one-line `compact` form on this page (same
  surface, same words); the registration keeps the full card.
- "Deine Saison" and the progress strip already share a block; its margins
  shrink.
- The hero keeps its content, with less vertical padding.
- No explanation paragraph above the columns (see 2); the line saying which
  table decides joins the zone legend below the table.
- Both columns use dense rows (43px): the `StandingsTable` `dense` variant
  and the Spielplan rows at the same height. Dense tables use a fixed layout
  (score columns sized by the header, the name truncates), and the columns
  are equal halves, so a division table with group tags keeps Punkte in
  view at 1280.

Verified by screenshots at both sizes, in group and division mode, with and
without the profile hint.

## Out

- Staff-Bereich and the other pages. Own plans follow.
- New information on the dashboard.
- Mobile layout beyond keeping it clean: it already stacks in the right
  order.

## Tests

Views only: no domain logic changes, so no new unit tests. Gallery specimens
are updated (group mode, division mode, replacement); screenshots at both
desktop sizes, in group and division mode, and on mobile.
