# Season number

**Status: implemented** (2026-07-04) — full suite green (340 tests), `/dev/ui`
verified (Saisonnummer input, „Nächste Saison" / „Saison 9" display).

The league already ran 8 seasons before this system, so „Saison 1" is wrong. Each
season needs its number, decided **once** for the first season on the system and
auto-incremented thereafter.

## Rule

- The season number lives on the `registration_windows` row (one window = one
  season).
- Opening the **first** window (none exist yet): staff enter the starting number
  (e.g. 9). This is the only time it is chosen.
- Every later window: number = `latestWindow.seasonNumber + 1`, computed
  server-side, shown read-only, never editable.
- Displayed everywhere as `seasonName(n)` = „Saison {n}", replacing the hardcoded
  `SEASON_NAME` constant and the „Saison 1" literal.

## Affected code

- `src/db/schema.ts` — `season_number` int on `registration_windows` (+ migration).
- `src/features/staff/registration-window.ts` — `RegistrationWindow.seasonNumber`;
  drop `SEASON_NAME`, add `seasonName(n)` + a first-season number field on the open
  schema.
- `src/features/staff/queries.ts` — `createWindow` takes the number; `latestWindow`
  returns it (its number is the max, so next = +1).
- `src/features/staff/actions.ts` — `openRegistration` requires the number only for
  the first window; otherwise derives `latest + 1`.
- `src/features/staff/components/open-registration-dialog.tsx` — number input for
  the first season, read-only computed number otherwise.
- Display plumbing — thread `seasonName` into: `staff/page.tsx`, `anmeldung/page.tsx`,
  `spieler/page.tsx`, `registration-status.tsx`, `registration-confirmation.tsx`,
  `finalize-dialog.tsx` (via seeding workspace/toolbar), `seeding-toolbar.tsx`,
  `public-league/queries.ts`.

## Tests

- `openRegistrationSchema`: first-season number required + coerced/validated.
- (existing registration-window tests stay green with the new field.)
