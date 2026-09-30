# Buli Hub — Staff-Bereich: Übersicht, Navigation, Unterseiten

Companion to `DESIGN.md`. Describes how the Staff-Bereich is built today;
the reasoning is in `docs/plans/staff-dashboard.md`. Built final without a
designer hand-off. `STAFF-BEREICH.md` (season card, open-registration dialog)
and `SAISON-DASHBOARD.md` (match rows, worklists, staff zone on the match
page) still describe those pieces; where they place them on `/staff`, this
document wins.

The rule: concrete problems are shown directly with the one action that
solves them, everything normal is a number, full lists live on their own
pages.

## 1. Staff navigation

The staff pages are the Staff-Bereich section of the site navigation
(`NAVIGATION.md`): the standard header with the section's row under it.

- Groups, in this order: Übersicht | Woche, Aufnahmen | Teilnehmer,
  Divisionen, Spielplan, Match of the Week | Banliste, Nutzung. The entries
  per phase and role come from the pure `staffNav`
  (`src/features/staff/nav.ts`): the week group and Spielplan/MotW once a
  schedule exists, Teilnehmer from the open registration on, Divisionen from
  the closed registration on, Nutzung for admin+.
- The seeding workspace uses the same header; only the workspace below it is
  1520px wide and scrolls sideways inside its own frame on a narrower window.
  It has no back link of its own.
- "Spielplan" is `/staff/spielplan`: the public schedule (`FullSchedule`,
  `embedded`) inside the staff shell, so no staff tab leads out of the
  Staff-Bereich.

## 2. Staff page anatomy (`StaffPage`, `src/features/staff/components/staff-page.tsx`)

Every staff page, the overview included: site header with the
Staff-Bereich row, then
`max-w-[1040px] px-6 pt-9 pb-14 sm:px-8`:

- Title row `flex flex-wrap items-center justify-between`: large tick +
  `h1 text-[30px]`; optional `action` on the right (the Banliste's "Spieler
  bannen", the overview's season line).
- Optional intro `mt-2 max-w-[680px] text-sm text-muted-foreground`.
- Content `mt-8`.

## 3. Übersicht (`/staff`)

Top to bottom, in every phase:

1. **Title row.** Running season: the season line on the right, two rows
   right-aligned (`sm:items-end`): **Saison 9** (`font-heading text-[18px]`)
   + small tick + phase label, then **Spieltag n von m**, a 112px progress
   bar and the week's dates. Pre-season: the season card
   (`STAFF-BEREICH.md` §3) as the first block instead, since opening the
   window happens in it.
2. **Zu erledigen** (`TodoList`): one card, one row per item, derived by the
   pure `staffTodos` (`src/features/staff/todos.ts`). Row `py-3.5 pr-4 pl-6`
   with a 6px rail on the left edge and a faint wash: red
   (`bg-destructive`, wash `/4`, title `text-destructive`) when something is
   overdue or held back, orange when it is due. Title `text-[14.5px]
   font-semibold`, detail `text-[13px] text-muted-foreground`, optional
   extra lines `text-[12.5px]`. Action right: a solid orange button on red
   rows, an outline button on orange ones; controls (Discord sync, publish
   schedule, create schedule) render in the same slot. Red rows come first.
   Empty: one bordered row with a check icon, "Nichts zu tun. Alles läuft."
3. **Diese Woche** and **Saison**, side by side from `lg` (single column
   below), each a section header and a 2 × 2 grid of `StatTile`s.
   Pre-season there is no week, and the four season tiles span the width.
   - Tile `rounded-lg border px-4 py-3`: number `font-heading text-[26px]`
     (muted at 0), optional small `sub` beside it ("von 68"), label
     `text-[11.5px] uppercase tracking-[0.08em]`. Linked tiles lead to the
     full list: a small `ArrowUpRight` in the top right corner (muted at
     50%) marks them as links before they are touched; on hover the border
     turns fully orange, the tile gets a faint orange wash
     (`bg-brand-orange/[0.06]`) and the arrow turns orange. Red tiles do the
     same in red. `alert` tiles turn red while
     not 0, only for numbers that are also a todo.
   - Diese Woche: Offen, Gemeldet (von n), Überfällig (alert), Angefochten
     (alert), all into the Woche page.
   - Saison (running): Spieler, Drops, Nicht auf dem Server, MotW bestätigt
     (von the finished Spieltage). Pre-season: Anmeldungen, Neu dabei, Nicht
     auf dem Server, Nicht geprüft.

At 1440 × 900 the running-season overview fits one screen with five todos.

## 4. Woche (`/staff/woche`)

The worklists from `SAISON-DASHBOARD.md` §4–6 in `WeekMatches`: Überfällig
(with the Freewin quick action), Angefochten, Freewins bestätigen, each only
when not empty and each with an anchor (`#ueberfaellig`, `#angefochten`,
`#freewins`); then one Spieltag's matches under **Spieltag n** with the
open/all toggle and a pager (‹ ›, "Aktueller" when away from the running
one; `?spieltag=n#spieltag`); the resolved disputes collapsed at the end.

## 5. Teilnehmer (`/staff/teilnehmer`)

Everyone registered in the season as one list (`StaffParticipantList`):

- Filter chips with counts (Alle, Nicht auf dem Server, Nicht geprüft,
  Gedroppt; a chip with 0 is hidden), `?filter=` preselects one. Name search
  right (`sm:w-64`).
- One card: header row with the count and the membership stamp plus the
  refresh icon; rows `py-2.5` with avatar, name (profile link), group chip,
  status tags from the pure `participantTags`: **Nicht auf dem Server**
  (red wash), **Nicht geprüft** (outline), **Drop** (red wash), **Ersatz**
  (navy outline), **Ersetzt** / **Ersatz angefragt** (outline). A dropped row
  sits on `bg-muted/25` with its reason and the replacement line under the
  name.
- One quiet action per row, by phase: **Stornieren** (ghost) until the
  seeding is final; then **Droppen** (ghost), and for a dropped player the
  drop controls (Ersatz einsetzen, Drop aufheben, Angebot zurückziehen).
