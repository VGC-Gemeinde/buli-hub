# Head-to-head tiebreaker (group standings)

**Status: done** (2026-07-31)

Insert a **head-to-head** level into the standings ranking, between game differential
and game win rate — but only for **sub-division (group) standings**, never for the
combined division table.

This is the authoritative standings ruleset. It supersedes the rank order in
[[standings-tiebreakers]], which is marked as superseded and points here; everything
else in that document (game scoring per outcome, shared ranks, why the division
table's keys must stay opponent-independent) still holds.

## Why group-only

The division table's whole justification is that every ranking key is
opponent-independent, so players from different sub-divisions who never met are
still comparable (`standings.ts` header, `division-table.md`). Head-to-head is
opponent-dependent by definition and simply does not exist for most pairs in that
table.

The tempting middle ground — apply head-to-head in the division table too, but only
to tied pairs who happen to share a group — is worse than either extreme: two
players tied at the same rank, one of whom gets a head-to-head tiebreak and the
other does not, inside one table. Rejected.

**Known consequence, accepted:** post-season config picks a `relevantTable` per
division (`src/features/seeding/post-season.ts`). For a division set to `"division"`,
promotion and relegation are decided off the division table, so head-to-head will
visibly reorder that division's group tab while having no effect on who actually
goes up or down. Both tabs render side by side. This is a display/decision split
that staff should be aware of; it is not a bug.

## Ruleset

Rank order for group standings (each level breaks ties left by the previous):

1. **Match wins** (raw count)
2. **Game differential** (`gamesWon − gamesLost`)
3. **Head-to-head within the tied block** *(new — group standings only)*
4. **Game win rate** (`gamesWon / (gamesWon + gamesLost)`)
5. **Genuinely tied** — shared rank, next rank skips (…, 3, 3, 5, …); display order
   within a tie alphabetical for stability.

### How head-to-head resolves

A **tied block** is the set of players equal on both match wins *and* game
differential — i.e. everyone level after step 2. For each player in a block, count
the matches they won **against other members of that same block**. Higher count
ranks higher.

- Wins against players outside the block never count. The count is meaningless
  outside its block, and blocks never compare against each other (they already
  differ on wins or differential).
- **Equal counts fall through to game win rate.** This is what makes cycles safe: if
  A beat B, B beat C and C beat A, all three sit at one head-to-head win, the level
  resolves nothing, and step 4 takes over. No special-casing.
- **No recursion.** After splitting a block by head-to-head count, the resulting
  sub-groups are *not* re-blocked and re-compared head-to-head. They go straight to
  game win rate.

Worked examples for a three-player block:

| Case | h2h wins | Result |
| --- | --- | --- |
| A beat B and C; B beat C | A 2, B 1, C 0 | fully resolved: A, B, C |
| A beat B and C; C beat B | A 2, C 1, B 0 | fully resolved: A, C, B |
| A beat B, B beat C, C beat A | A 1, B 1, C 1 | unresolved → game win rate |
| A beat B and C; B vs C unreported | A 2, B 0, C 0 | A first; B/C → game win rate |

### Which matches count as a head-to-head win

The same filter the tallies already use — a **confirmed match win** of any kind:

| Outcome | Head-to-head |
| --- | --- |
| normal (2:0 / 2:1) | winner takes it |
| free win, confirmed | winner takes it — consistent with it counting as a match win in step 1 |
| double loss | neither |
| free win, still pending | neither |
| unreported / bye | neither |

A dropped player's matches are already mapped to 2:0 free wins for the opponent
before `computeStandings` sees them (`queries.ts`, `groupResults`), so those count
as head-to-head wins over the dropped player. Consistent with step 1, which already
awards the match win.

### Shared ranks

Head-to-head participates in genuine-tie detection: two players equal on wins,
`gamesWon` and `gamesLost` but **not** on head-to-head count get **distinct** ranks.
They share a rank only when the head-to-head count is equal too. Both are always in
the same block when the first three are equal (equal wins + equal game tallies
implies equal differential), so the counts are always comparable. All four values
are integers — no float comparison enters tie detection, same rule as before.

Net effect: fewer genuine dead heats in group mode, so fewer unresolved boundary
ties handed to staff in the post-season.

## Scope

**In:**

- `computeStandings` gains an opt-out for head-to-head; block computation, the new
  comparator level, and tie detection updated.
- `divisionStandings` opts out explicitly.
- Tests.

**Out:**

- Any change to the division table's ranking.
- Surfacing the head-to-head count as a standings column (see below).
- Resolving a genuine tie that survives all four levels — still the post-season
  feature's job.
- Schema changes; Discord touchpoints.

## Schema

None. `matches` / `match_results` / `match_games` already carry everything.

## Affected code

- `src/features/reporting/standings.ts`
  - Extract the "counted decisive match" filter already inlined in the tally loop
    into a small helper yielding `{ winnerId, loserId }`, and use it for both the
    tally and the head-to-head counts, so the two can never disagree about which
    matches count.
  - `computeStandings(input)` gains `headToHead?: boolean`, **defaulting to true**
    (group standings are the normal case; the division table is the one exception).
  - Compute `h2hWins` per player after the tally: block rows by
    `(wins, gamesWon − gamesLost)`, count intra-block wins. Kept in a local `Map`,
    not on `StandingsRow` — the value is block-relative and would be misleading as a
    row field, and it does not exist at all in division mode.
  - Comparator becomes `wins → differential → h2hWins → rate → name`.
  - `tiedForPlacement` additionally compares `h2hWins`; it therefore needs the map
    passed in rather than being a bare pairwise function of two rows.
  - `divisionStandings` passes `headToHead: false` with a comment pointing at the
    opponent-independence argument above.
- `src/features/reporting/standings.test.ts` — new cases, below.
- Header comment on `standings.ts` rewritten to describe the four-level ruleset and
  the group/division split.

No changes needed in the query layer, the views, `/dev/ui`, or the personas: no new
component, no new visual state, no new auth-metadata shape. `StandingsRow`'s shape
is unchanged, so `standings-panel.tsx`, `season-dashboard.tsx`, the public league
view and `motw.ts` all keep working untouched.

## Test cases (`standings.test.ts`)

Head-to-head, group mode:

- pair tied on wins + differential, one beat the other → winner ranks higher, and
  the two get **distinct** ranks rather than a shared one.
- three-player block, one beat both others, third pair decisive → fully ordered
  (2 / 1 / 0).
- three-player cycle → all on one head-to-head win → order falls through to game
  win rate.
- head-to-head match was a double loss → neither gains → falls through.
- head-to-head match unreported / free win still pending → falls through.
- confirmed free win counts as a head-to-head win.
- wins against players **outside** the block do not inflate the count (a player with
  a better record beating everyone must not lift a tied player's head-to-head).
- head-to-head never overrides differential: a player with a worse differential
  stays below even having won the direct match.
- players equal on wins, games **and** head-to-head still share a rank.

Division mode:

- `divisionStandings` over groups whose members did play each other produces the
  pre-head-to-head order — the opt-out actually takes effect.
- existing `divisionStandings` cases stay green unchanged.

## Documents kept in step

A reader landing on an older plan must not walk away with the three-level ruleset:

- `standings-tiebreakers.md` — superseded banner at the top pointing here; its rank
  order marked historical; the sort description and the genuine-tie note amended.
- `division-table.md` — records that head-to-head exists and that
  `divisionStandings` switches it off, with the reason.
- `post-season-setup.md` — its deferred-tie note points here as well, and flags that
  head-to-head does not apply in `division` mode.
