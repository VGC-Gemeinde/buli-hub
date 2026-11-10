# Research: Standings table on a phone

## R1. Fit the screen instead of scrolling

- **Decision**: Below `sm` the table uses a fixed layout with no minimum width and no sticky
  columns, so it is exactly as wide as its container (measured: 340px of 340px at a 390px
  viewport, public overview and dashboard).
- **Rationale**: The scrolling table hid the ranking column until a swipe and, while swiping, slid
  the first digit of Game-WR. under the frozen name column ("50,0 %" read as "0,0 %"). A table that
  fits has neither problem. Five columns fit once the badges leave the name's line.
- **Alternatives considered**: Keep scrolling and only narrow the columns (still overflows by
  ~20px with real names and badges, partial numbers remain); a card list per player (a different
  anatomy from desktop, rejected for the same reason as variant A below).

## R2. Variant B over variant A

- **Decision**: Keep the three number columns (variant B); move the badges to a second line.
- **Rationale**: Chosen by the maintainer in the mockups: the columns read the same on every
  device, the weighting of PR #51 (Bilanz bold anchor, Diff. regular, Game-WR. muted) survives
  unchanged.
- **Alternatives considered**: Variant A, one right-hand column with Bilanz bold and Diff. and
  Game-WR. stacked small beneath it, giving the name about 190px instead of about 90px. Its column
  head ("Bilanz" over "Diff. · Game-WR.") read awkwardly; a version with labels above two fixed
  sub-slots was shown and not chosen.

## R3. Sticky columns on the phone

- **Decision**: Below `sm` the Platz and Spieler cells are `relative` with `left: 0` instead of
  `sticky`.
- **Rationale**: Without overflow sticky does nothing useful, but a sticky cell whose `left` offset
  (44px) exceeds its natural position (38px on the phone) would still be pushed right. `relative`
  keeps the cells as the containing block of their tint overlay (`before:absolute inset-0`) and the
  zone rail; `left: 0` cancels the desktop offset, which `relative` would otherwise apply.
- **Alternatives considered**: `static` (the overlay and rail would position against the wrong
  ancestor); keeping the 44px Platz column (costs the name 6px for nothing).

## R4. Badges on their own line

- **Decision**: The identity cell is avatar plus a column: the name (with the favourite star) on
  the first line, the badges on a second line that clips (`overflow-hidden`); from `sm` up the
  column becomes a row again and the badge group does not shrink.
- **Rationale**: The name gets the cell's full width; no combination of badges can run into the
  numbers (FR-005). Rows without badges stay single-line.
- **Alternatives considered**: Dropping the Du badge on the phone (rejected by the maintainer, see
  the spec's UX decisions); shrinking badges further (unreadable at 10px and below).
