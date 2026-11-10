# Feature Specification: Standings table on a phone

**Feature Directory**: `specs/006-standings-phone-layout/`

**Created**: 2026-11-10

**Status**: Shipped 2026-11-10

**Input**: User description: "Tabelle auf dem Handy: Die Standings-Tabelle (öffentliche
Liga-Übersicht und Spieler-Dashboard, Gruppen- und Divisionstabelle) passt auf Handybreite in den
Bildschirm, ohne horizontales Scrollen. [...] Gewählte Lösung (Variante B aus den Mockups): Die
drei Zahlenspalten Game-WR. · Diff. · Bilanz bleiben wie auf Desktop, nur enger; der Avatar wird
kleiner; die Badges wandern in eine zweite Zeile unter den Namen, "Du" bleibt als Badge. Desktop
bleibt unverändert." Decided by the maintainer on 2026-11-08 and 2026-11-09 after a screenshot of
the production table on a phone and two mockup variants.

## User Scenarios & Testing *(mandatory)*

The standings table is the hub's most viewed display and is mostly looked at on a phone. Its
columns were last changed in PR #51 (shipped without a spec): the Punkte column was dropped,
because a win is always 3 points and Bilanz therefore ranks the same, and the Game Winrate, a
tiebreaker that had been invisible, became a column. The order is Pl. · Spieler · Game-WR. ·
Diff. · Bilanz: the tiebreakers run right to left into Bilanz, the bold anchor on the right;
Diff. is regular, Game-WR. muted with one decimal ("56,3 %", one decimal because values level on
differential sit close together).

On a phone (about 340px of table width) that table was 400 to 480px wide and scrolled sideways
under a frozen Platz and Spieler column. A screenshot from production showed what that costs:

- Bilanz, the column that ranks the table, was cut off on the right until the reader swiped.
- Swiping slid the first digit of Game-WR. under the frozen name column, so "50,0 %" read as
  "0,0 %", a plausible but wrong value.
- Names were cut after two or three characters, so the table no longer said who is where.
- The badges (group, Drop, Ersatz, Du) competed with the name for the same line and the Drop badge
  ran across the column edge into the numbers.

This feature gives the table its own anatomy below the phone breakpoint. Desktop stays as it is.

### User Story 1 - The whole table fits a phone (Priority: P1)

A player opens the league overview or their dashboard on a phone and reads every column of the
standings without swiping: place, name, Game-WR., Diff. and Bilanz, each value whole.

**Why this priority**: It removes the misleading partial numbers and puts the ranking column on
screen. It is the reason for the feature.

**Independent Test**: At a 390px wide viewport, in the public overview and the dashboard, the
table is exactly as wide as its container, nothing scrolls sideways, and every value of every row
is fully visible.

**Acceptance Scenarios**:

1. **Given** a group or division table with ten or more players, **When** it is shown at 390px,
   **Then** the table does not scroll horizontally and all five columns are visible.
2. **Given** a row with Game-WR. "100,0 %", Diff. "−14" and Bilanz "10 : 2", **When** it is shown
   at 390px, **Then** each of the three values is shown whole on one line.
3. **Given** the table at 390px, **When** the reader compares two rows, **Then** Bilanz is the bold
   column on the right, Diff. regular and Game-WR. muted, as on desktop.

---

### User Story 2 - Names stay readable, badges stay out of the numbers (Priority: P1)

A player scans the phone table for themselves, a favourite or an opponent and recognises names;
the group, Drop, Ersatz and Du badges sit under the name instead of next to it.

**Why this priority**: A table whose names are two letters long does not say who is where; and a
badge reaching into the numbers garbles the row. Both were visible in the production screenshot.

**Independent Test**: At 390px, a row with group, Drop and Du badges shows the name on the first
line and the badges on a second line, and no badge extends past the name column into a number
column.

**Acceptance Scenarios**:

1. **Given** a division table row with a group label, **When** it is shown at 390px, **Then** the
   name takes the first line of the cell and the group label sits on a second line under it.
2. **Given** the viewer's own row in a zone (rail in the zone's colour), **When** it is shown at
   390px, **Then** the Du badge sits on the second line, alongside any group label.
3. **Given** a dropped player's row, **When** it is shown at 390px, **Then** the Drop badge sits on
   the second line and does not extend into the Game-WR. column.
4. **Given** a name longer than the cell, **When** it is shown at 390px, **Then** it is shortened
   with an ellipsis on its own line, while the badges stay whole on theirs.
5. **Given** a row without any badge (a group table, a player who is neither the viewer nor
   dropped nor a replacement), **When** it is shown at 390px, **Then** it is a single line.

---

### User Story 3 - Desktop is unchanged (Priority: P2)

A visitor on a desktop or tablet (from the `sm` breakpoint up) sees the table as before this
feature: avatar, name and badges on one line, Platz and Spieler frozen while wider tables scroll.

**Why this priority**: The desktop table works; the change must not cost it anything.

**Independent Test**: At 1280px the public overview and the dashboard tables render with the same
columns, widths, inline badges and avatar size as before this feature.

**Acceptance Scenarios**:

1. **Given** a desktop viewport, **When** the dashboard table is shown, **Then** badges sit inline
   after the name and the avatar has its desktop size.
2. **Given** a desktop table wider than its container, **When** it scrolls, **Then** Platz and
   Spieler stay frozen on the left, as before.

### Edge Cases

- Shared places (two rows with rank 21): unchanged, both rows show 21.
- A player without games yet: Game-WR. shows the placeholder "—", which fits the column.
- A favourite: the star stays before the name on the first line.
- Zone tints, rails and the legend below the table: unchanged at every width.
- A replacement: the Ersatz badge sits on the second line with its tooltip.
- Hangul, emoji and very long names: shortened with an ellipsis, never pushing the numbers.
- The dense dashboard table and the public table get the same phone anatomy.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Below the phone breakpoint the standings table MUST fit its container's width: no
  horizontal scrolling and no frozen columns.
- **FR-002**: Below the phone breakpoint the table MUST keep the desktop columns and their order,
  Pl. · Spieler · Game-WR. · Diff. · Bilanz, with the desktop weighting (Bilanz bold, Diff.
  regular, Game-WR. muted, one decimal).
- **FR-003**: Below the phone breakpoint every value in the three number columns MUST be shown
  whole on one line, including the widest realistic values ("100,0 %", "−14", "10 : 2").
- **FR-004**: Below the phone breakpoint the badges of a row (group label, Drop, Ersatz, Du) MUST
  sit on a second line under the name; the name keeps the cell's full width on the first line.
- **FR-005**: A badge MUST never extend past the name column into a number column, at any width.
- **FR-006**: The Du badge MUST stay a badge on a phone; the row keeps its rail, tint, bold name
  and filled avatar as well.
- **FR-007**: Below the phone breakpoint the avatar MUST be smaller than on desktop, so the name
  gets the room.
- **FR-008**: From the phone breakpoint up the table MUST stay as before this feature: badges
  inline after the name, desktop avatar size, Platz and Spieler frozen when the table scrolls.
- **FR-009**: Both places that show the standings table (public league overview and Spieler-
  Dashboard, each with group and division table) MUST get the same phone anatomy.

## UX & Mockups *(mandatory when users see a change)*

**Status**: Approved 2026-11-10

**Explanation level**: Display page: the layout speaks. The table is read, not operated; the
column heads, the zone legend and the existing tooltips (Game Winrate, Drop, Ersatz) carry
everything, so no copy is added.

| View | Route | Who sees it | Mockup file |
|------|-------|-------------|-------------|
| Standings table (group and division) | `/` (Liga-Übersicht), `/spieler` (Spieler-Dashboard) | Public visitors, signed-in users, registered players and participants, staff | [mockups/standings-table.html](mockups/standings-table.html) |

The mockup shows phone (390px) and desktop in light and dark, with a switch between the division
table (group labels on every row) and a group table, and covers the viewer's own row in a zone,
Drop, Ersatz, a favourite, a player without games ("—"), shared places, long names, Hangul and
emoji.

**UX decisions**:

- Two phone variants were iterated: A (one right-hand column, Bilanz bold with Diff. and Game-WR.
  stacked small beneath it) and B (the three desktop columns kept, narrower, badges under the
  name). The maintainer chose **B**: the columns read the same on every device.
- Du stays a badge on the phone (on the second line), not only the row marking: in a zone the
  rail is the zone's colour, so the badge is what says "this is you".
- Phone sizes: Platz 38px, Game-WR. 66px, Diff. 44px, Bilanz 60px, the name takes the rest;
  avatar 22px (desktop 26px); column heads 10.5px with tighter tracking so "GAME-WR." fits; badges
  without vertical padding on their own line.
- A row without badges stays one line; rows therefore differ in height in a group table. Accepted
  in the mockup.
- The badge line clips instead of overflowing, so even an unusual combination never reaches the
  numbers (FR-005).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At a 390px viewport the standings table never scrolls horizontally, in the public
  overview and the dashboard, light and dark.
- **SC-002**: At 390px no value of the three number columns is partly hidden in any row.
- **SC-003**: At 390px a name of 9 characters is shown whole in a division table row that also
  carries a group label (in the production screenshot names were cut after 2 to 3 characters).
- **SC-004**: At 1280px the table looks as it did before this feature.

## Assumptions

- The phone breakpoint is the design system's `sm` (640px), as everywhere in the hub.
- The column set and order shipped in PR #51 is the baseline and does not change here; this spec
  records it because #51 shipped without one.
- The Regelwerk keeps speaking of points for Saison 9 (rules do not change mid-season); a comment
  in `src/features/regelwerk/content/saison-9.tsx` notes that the next rulebook should speak of
  wins.
- No data, schema or Discord change: the feature is layout only.
