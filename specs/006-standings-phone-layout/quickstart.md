# Quickstart: verifying the standings table on a phone

## Prerequisites

```bash
npm run db:start
npm run dev                      # localhost:3000
```

A running season with tables: sign in as a persona at `localhost:3000/dev`, then open
`/dev/seed-registrations?even=1` (equal-size groups, so the dashboard also shows the division
table with group labels). Note that the integration tests wipe this data.

## Scenarios

1. **Phone, public overview** (`/`, viewport 390px, light and dark): the table is as wide as its
   container and does not scroll sideways; every Game-WR., Diff. and Bilanz value is whole; badges
   (Du, Drop, Ersatz) sit under the name (spec US1, US2).
2. **Phone, dashboard** (`/spieler`, 390px, accept the Regelwerk once): same, in the dense table;
   in the division view every row carries its group label on the second line (US2 scenario 1).
3. **Desktop** (1280px): avatar, name and badges on one line, column widths as before, Platz and
   Spieler frozen if the table overflows (US3).
4. **Edge cases**: a player without games shows "—" in Game-WR.; a favourite keeps the star before
   the name; a long name ends in an ellipsis on its own line.

## Checks

```bash
npx biome check .
npm run typecheck
npm test -- --run                # wipes the local database; ask first
```
