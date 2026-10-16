# Contract: routes and URL state

All routes are public Server Components in the Liga section (`SiteHeader section="liga"`). The
row entry "Statistiken" (`/statistiken`) is marked on every page below (`activeHref` prefix match).

## Routes

| Route | View |
|-------|------|
| `/statistiken` | redirects to `/statistiken/pokemon`, keeping the query string |
| `/statistiken/[kategorie]` | ranking; `kategorie` ∈ `pokemon`, `items`, `faehigkeiten`, `attacken`, else 404 |
| `/statistiken/[kategorie]/[id]` | detail; `id` = `toId(name)`, `none` for "Kein Item"; an unknown id under the current filters renders the "nicht gespielt" empty state, not a 404 |

## Query parameters

Parsed with Zod; invalid or unknown values fall back to the default (never an error page).
Defaults are omitted from generated links, so the plain URL is the default view.

| Param | Values | Default | Applies to |
|-------|--------|---------|-----------|
| `phase` | `regular`, `post` | all | every view; ignored before the Nachsaison has begun |
| `division` | tier number | all | every view |
| `woche` | round number of a started week | all | every view; dropped when not in the chosen phase |
| `sort` | `name`, `use`, `win`, `matches`, with `-asc`/`-desc` (e.g. `win-desc`) | `use-desc` | rankings |
| `min` | `1`, `2`, `5`, `10` | none | rankings |
| `mega` | `mega`, `base` | all | Pokémon ranking |
| `protect` | `0` (hidden) | shown | move ranking |
| `steine` | `1` (own stones counted) | own stones taken out | item ranking |
| `alle` | `1` (show every entry instead of the top 30) | top 30 | rankings |

`woche` is the round of a week: a regular Spieltag ("Spieltag N") or a Nachsaison week ("Woche N");
the spec's "Spieltag" filter covers both.

Links between views carry `phase`, `division`, `woche`; switching category drops the
category-specific parameters (`mega`, `protect`, `steine`) and `sort`/`min`/`alle` stay.
"Filter zurücksetzen" goes to the plain URL of the current view, keeping only the sort.

## Example

`/statistiken/attacken/fakeout?division=2&woche=5` is Fake Out's detail over Division 2's
Spieltag 5.
