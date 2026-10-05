# Staff week pager

**Status: done** (2026-10-05): both workspaces checked in the `/dev/ui`
gallery (marks, legend, the active chip's inverted hold count, stepping with
the chevrons).

## Context

The two staff workspaces page through Spieltage with the same chip anatomy,
implemented twice: `MotwWeekPager` (`src/features/motw/components/
motw-week-pager.tsx`) and `WeekPager` in `src/features/recordings/components/
recording-manager.tsx`, and had drifted: MotW had the chevrons, Aufnahmen
did not. Both now render the shared pager.

The public Liga pages (overview, Favoriten) use the `SpieltagTimeline`
instead, and that stays: the timeline answers "where in the season am I", the
staff chips are a worklist that carries a per-week state (VOD missing,
candidates unconfirmed, holds). One pager per area, not one for the whole hub.

## Scope

- One shared `StaffWeekPager` in `src/features/staff/components/
  staff-week-pager.tsx`: chips
  (round number over a mark slot, navy when selected, orange border/ring for
  the current Spieltag), chevrons on both sides, scroll-into-view for long
  seasons, a legend slot below whose "Aktueller Spieltag" entry is the
  pager's own (`PagerLegendItem` for the rest).
- Each workspace passes only its own mark per week (`mark(round, active)`),
  the tooltip text (`describe(round)`) and its legend: MotW the four shapes,
  Aufnahmen the hold count.
- Views only. No change to domain logic, queries or tests. The gallery
  already shows both workspaces with their pagers, so it needs no new
  specimen.
