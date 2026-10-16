# Quickstart: validating the usage stats

## Prerequisites

- `supabase start` and `npm run dev` running.
- A season with reported results and sheets: the dev seed (`/dev`) or `npm run db:clone-prod`.
  Ask the maintainer before running the integration tests: they wipe the local database.

## Automated

```bash
npm test -- --run src/features/pokemon-stats   # unit + integration tests of the feature
npx biome check . && npx tsc --noEmit
npm test -- --run                              # full suite before the commit
```

Expected: the invariants in `data-model.md` hold; the integration test proves that an embargoed
match (MotW without VOD, recording hold) is absent from `countedSheets`, that a released one is
present, that drop-decided regular matches are counted but not rated, that tiebreakers count under
the regular season in "Woche 1", and that a relegation sheet counts for its own player's division.

## In the running app

1. `/statistiken`: redirects to `/statistiken/pokemon`; "Statistiken" marked in the Liga row.
2. Pokémon ranking: shares add up to 600 %, a Mega with its pill is its own entry, the line above
   reads "N Teams · M Pokémon · Spieltag 1 bis X".
3. Sort by Siegquote, then Matches; "#" stays the usage rank. Set "Nutzung ab 5 %": entries hide,
   "Filter zurücksetzen" becomes visible without moving anything.
4. Items: Mega stones on their own Mega are gone by default; switch "Ohne Mega-Steine" off and
   they appear; a stone on a wrong Pokémon stays in both states.
5. Attacken: type icons in the pinned column; "Ohne Protect" rescales the bars.
6. Open Charizard (Mega Y): stone fixed, Mega ability in orange, "Im Teamsheet" below, "Auch
   gespielt als" links. Open Fake Out: the card shows Champions BP and ACC.
7. Set a division and a Spieltag, copy the URL into a private window: same view, signed out.
8. Mark a match as recording hold in `/staff/aufnahmen`: its sheets leave every number on reload;
   release it: they come back.
9. Repeat 2 to 6 at 390 px width (table scrolls sideways, rank and sprite pinned) and in dark mode.
10. With `npm run db:clone-prod` data: the ranking page answers in well under a second (R10).
