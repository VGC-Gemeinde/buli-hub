# Quickstart: validating forme grouping

## Automated

```bash
npx vitest --run src/features/pokemon-stats   # unit tests: formes, sheets, rankings, details
npm test -- --run                             # full suite (wipes the local DB; ask first)
npx biome check . && npx tsc --noEmit
```

Expected: the invariants in `data-model.md` are covered by `formes.test.ts`, `sheets.test.ts`,
`rankings.test.ts` and `details.test.ts`, all green.

## In the running app

Prerequisite: `supabase start`, `npm run dev`, and production-shaped data (`npm run
db:clone-prod`; the local clone of 2026-10-16 holds the formes named below). Do not run the test
suite afterwards without re-cloning.

1. `/statistiken/pokemon?alle=1`: Sinistcha, Maushold, Vivillon and Palafin each appear once
   (66, 12, 9 and 3 counted teams in the 2026-10-16 clone, SC-001); no Sinistcha-Masterpiece,
   Maushold-Four, Vivillon-Ocean or Palafin-Hero rows. Indeedee-F, Basculegion-F, Meowstic-F,
   Lycanroc-Dusk, Rotom-Heat and the regional formes are still their own rows.
2. Open Vivillon: the right column starts with the panel "Formen" (Vivillon, Vivillon-Ocean,
   Vivillon-Elegant, Vivillon-High Plains with box icons, shares adding up to 100 %), above
   "Item". Rows are not links.
3. Narrow the filters until Sinistcha has only base appearances: no "Formen" panel. If a week exists
   where every Vivillon is one pattern, the panel shows that one row at 100 % (otherwise covered
   by the unit tests only).
4. Open Incineroar and Mega Charizard Y: no "Formen" panel; "Auch gespielt als" unchanged.
5. `/statistiken/pokemon/sinistchamasterpiece?division=1` lands on
   `/statistiken/pokemon/sinistcha?division=1`.
6. A teammate list and an item's carrier list show Sinistcha (not Sinistcha-Masterpiece).
7. `/pastes/<uuid>` of a sheet with Vivillon-Ocean still shows Vivillon-Ocean.
8. Steps 1, 2 and 3 at phone width (390 px) and in dark mode.
