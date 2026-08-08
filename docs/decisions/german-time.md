# The league runs on German time

The VGC Bundesliga is a German-speaking community; deadlines must be
unambiguous for players. Every time the hub touches a clock, it uses
**Europe/Berlin** — never the server's timezone (UTC on Cloud Run) and never
the visitor's:

- **Domain day decisions** — which Spieltag is current, whether a match is
  overdue, which day a schedule starts — compare against `germanToday()`
  (`src/lib/german-time.ts`), the Europe/Berlin calendar day. A Spieltag
  deadline of "Sonntag" therefore ends at German midnight, including across
  DST changes.
- **Displayed timestamps** (registration deadline, "gemeldet am", drop
  dates, …) render via `formatGermanDateTime` — German time for every
  visitor, wherever they are.
- **Day strings** (`YYYY-MM-DD` in `matchdays` etc.) are plain calendar days
  with no timezone of their own. They are compared lexically and rendered
  via `formatGermanDay`, which pins the UTC anchor so no runtime timezone
  can shift the displayed day.
- **Instants** (registration `closes_at`, `reported_at`, …) stay
  `timestamptz` — points in time, converted to German time only for display.

Accepted edge: staff enter the registration deadline through a
`datetime-local` input, which the browser interprets in *its* local
timezone. Staff sit in Germany; a staff member opening a registration while
traveling would set a slightly shifted instant. Not worth the complexity of
a timezone-aware input.

Anything new that formats a `Date` or needs "today" goes through
`src/lib/german-time.ts` — a bare `new Intl.DateTimeFormat("de-DE", …)` or
`toISOString().slice(0, 10)` is a bug.
