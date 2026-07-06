# German time everywhere

**Status: done** (2026-07-06)

Tiny slice. The convention and its reasoning live in
`docs/decisions/german-time.md`.

- `src/lib/german-time.ts` (unit-tested): `germanToday()` for every day-based
  domain decision (was UTC via `toISOString().slice(0, 10)` — deadlines
  effectively ended 1–2h after German midnight), `formatGermanDateTime` for
  displayed timestamps (previously rendered in the *server's* timezone — UTC
  on Cloud Run — or the visitor's), `formatGermanDay` for day strings.
- All 8 „today" call sites and all 12 formatter call sites converted; a bare
  `Intl.DateTimeFormat` or `toISOString().slice(0, 10)` outside the lib is a
  bug from now on.
