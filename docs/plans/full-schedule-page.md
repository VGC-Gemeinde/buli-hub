# Full schedule page (/spielplan)

**Status: done** (2026-09-01)

The public overview shows one Spieltag at a time; the whole season's schedule
is browsable only round by round. This feature adds **one public page with the
complete Spielplan**: every Spieltag with every pairing, per division. It looks
the same for every visitor — no per-user filtering; the only personalization is
the own-row highlight the overview already has.

Access follows the publish state (docs/plans/schedule-publish.md): during
`regular_season` the page is public; during `schedule_hidden` it is the staff
preview of exactly what will go live (non-staff get `notFound()`); in every
earlier phase it does not exist. No design pass for this feature — the
implemented view is the final design, built strictly from the existing
public-league conventions.

## Route & gate

`src/app/spielplan/page.tsx` — Server Component, no auth requirement.

- `currentSeason()`: `regular_season` → render; `schedule_hidden` → render
  only for staff (`currentUser` + `roleAtLeast staff`), else `notFound()`;
  anything else → `notFound()`.
- Data: `publicLeagueOverview(window.id, seasonNumber, today)` — reused
  unchanged; every `PublicGroup` already carries all rounds' matches with
  results, MotW badges and spoiler-safe fields.
- `SiteHeader section="liga"`: the page is the Liga row's "Spielplan"
  (`docs/plans/site-navigation.md`); spoiler cookie read exactly as on `/`.
  Staff reach the same schedule inside their area at `/staff/spielplan`.

## View

`src/features/public-league/components/full-schedule.tsx` (client, dumb):

- Header row in the overview's anatomy: Tick + "Spielplan" + season meta,
  `SpoilerSwitch` on the right. While `schedule_hidden`, a muted
  "Intern · noch nicht veröffentlicht" chip beside the season meta tells staff
  what they are looking at (the page renders identically otherwise).
- Division `Switcher` (the overview's pill switcher, reused).
- For the selected division, **every Spieltag as a section**: "Spieltag N" +
  the week range, the running round marked with a "Läuft" chip; below it each
  group (label + `MatchdayList` filtered to that round, the overview's rows —
  results, spoiler covers, MotW pill, own-row highlight, links to
  `/match/<id>`). Groups without a match that round are skipped; a round
  nobody in the division plays shows one muted line.
- Reuse over duplication: `Switcher`, `MatchdayList` and `weekRange` are
  exported from `public-league.tsx` (same feature, no new abstractions).

## Entry points

- **Site navigation**: "Spielplan" in the Liga section's row
  (`docs/plans/site-navigation.md`), next to "Übersicht". The overview itself
  carries no extra link to it.
- **Staff**: the same schedule inside the Staff-Bereich at `/staff/spielplan`
  (tab "Spielplan" in the staff row), which is also the preview while the
  schedule is still internal.

## Tests & dev tooling

- No new domain logic: the page is a dumb view over `publicLeagueOverview`
  (fully covered) plus an inline `filter(round)`. No new unit/integration
  tests.
- Gallery: a `FullSchedule` specimen with a small fixture (one division, two
  groups, two rounds, mixed reported/open/MotW rows).
- Manual/browser: hidden phase as staff (chip + full rounds) and as anon
  (404); published as anon (rounds, spoiler covers, match links).

## Scope

**In:** the route + gate, the `FullSchedule` view, the exports it reuses, the
three entry points, gallery specimen.

**Out:** per-user filtering, printable/export views, a site-header nav entry,
any change to the overview's round-by-round browsing.

## Open questions

None open.
