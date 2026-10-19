# Contract: routes

Extends `specs/001-pokemon-usage-stats/contracts/routes.md`; everything not named here stays as
001 defines it.

| Route | Change |
|-------|--------|
| `/statistiken/pokemon/[id]` | When `groupedEntryId(id)` differs from `id` (a forme now counted under its base, or a battle-only forme), a temporary redirect (307) to `/statistiken/pokemon/<grouped id>` with the query string unchanged. Otherwise as in 001. |
| `/statistiken/[kategorie]` (rankings) | No change in anatomy or parameters; entries are grouped (FR-001). |
| `/statistiken/{items,faehigkeiten,attacken}/[id]` | No change in anatomy; carriers are grouped entries (FR-001). |

## Example

`/statistiken/pokemon/sinistchamasterpiece?division=2` → 307 →
`/statistiken/pokemon/sinistcha?division=2`.

`/statistiken/pokemon/charizardmegay` and `/statistiken/pokemon/rotomwash` are not redirected.
