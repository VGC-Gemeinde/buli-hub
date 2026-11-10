# Implementation Plan: Standings table on a phone

**Date**: 2026-11-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-standings-phone-layout/spec.md`

## Summary

Below the `sm` breakpoint the shared `StandingsTable` switches to a fixed table layout that fits
its container: fixed widths for Platz and the three number columns, the name column takes the
rest, no sticky columns and no minimum width, so nothing scrolls. The identity cell becomes two
lines (name, then badges) with a 22px avatar. From `sm` up every class stays as it was. The change
is one component plus the design system's description of it; no logic, data or Discord change.
Research: [research.md](research.md).

## Technical Context

**Stack**: Next.js App Router + TypeScript, Postgres on Cloud SQL, the hub's own Discord sign-in, Cloud Storage, Drizzle ORM, Zod,
Tailwind CSS + shadcn/ui. New dependencies: none.

**Testing**: Vitest unit tests (domain logic), Vitest integration tests against the local Postgres
stack. No E2E. This feature adds no domain logic (layout only), so it adds no tests; constitution
Principle II excludes styling tests. Verification is the running-app check at 390px and desktop.

**Target**: Cloud Run container; desktop and phone browsers, light and dark mode.

**Affected areas**: `src/features/season/components/standings-panel.tsx` (`StandingsTable`, used by
the Spieler-Dashboard's `StandingsPanel` in dense mode and by the public league overview
`src/features/public-league/components/public-league.tsx`); `design/DESIGN.md` §8.9 (the table's
anatomy).

**Reused building blocks**: `StandingsTable` as is (zones, rails, tints, `ZoneLegend`,
`WithheldNote`, `PlayerAvatar`'s `size` prop, `PlayerLink`, `FavoriteStar`), `formatWinRate` from
`src/features/pokemon-stats/format.ts`, Tailwind's `max-sm:` and `sm:` variants.

**Legacy context read**: `docs/plans/standings-tiebreakers.md` (columns with Punkte, horizontal
scroll with frozen Platz + Spieler on narrow screens), `docs/plans/player-dashboard-at-a-glance.md`
(dense mode, fixed widths in the dashboard), `design/DESIGN.md` §8.9 (zones, rail, legend).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|-----------|-------|--------|
| I. Pure, server-side domain logic | No logic added; the component stays dumb. | Pass |
| II. Tests carry the weight | No domain logic, so no new tests; no styling tests (forbidden). Full suite stays green. | Pass |
| III. Boring tools, smallest mechanism | Tailwind breakpoint variants on the existing component, no new component, no dependency. | Pass |
| IV. Schema is code | No schema change. | Pass |
| V. Look and UX | Mockups approved 2026-11-10; phone and desktop, light and dark; tokens only; no relayout on state change (rows are laid out once); display page, no added copy. | Pass |
| VI. League voice and German time | No new copy; column heads unchanged ("Game-WR.", "Diff.", "Bilanz"); straight quotes. | Pass |
| VII. Spoiler protection | Same data, same projections (`groupStandingsInput`, `publicLeagueOverview`); only layout changes. | Pass |

Re-check after design: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/006-standings-phone-layout/
├── spec.md
├── mockups/standings-table.html
├── plan.md              # this file
├── research.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md
```

No `data-model.md` (no data) and no `contracts/` (no interface changes).

### Source Code (repository root)

```text
src/features/season/components/standings-panel.tsx   # StandingsTable: phone classes, two-line identity cell
design/DESIGN.md                                     # §8.9: columns and phone anatomy
docs/plans/standings-tiebreakers.md                  # backlink note (legacy, partly superseded)
```

## Schema & Migrations

None.

## Authorization & Visibility

Unchanged: the table renders what the public projections already deliver; embargoed results stay
out of it (constitution Principle VII). No viewer sees anything they did not see before.

## Discord Touchpoints

None.

## Routes, Navigation & Staff Integration

None. `/` and `/spieler` render the same component; no new route, section or staff entry.

## Documentation Impact

- `design/DESIGN.md` §8.9 describes the table's columns and its phone anatomy, pointing at this
  spec (a cross-feature anatomy, used by the public overview and the dashboard).
- `docs/plans/standings-tiebreakers.md` gets the backlink note: its column list (with Punkte) and
  the narrow-screen scrolling are superseded.
- `CLAUDE.md`: no feature paragraph covers the standings table, and nothing structural changes, so
  the map stays as is.
- No constitution amendment.

## Complexity Tracking

No violations.
