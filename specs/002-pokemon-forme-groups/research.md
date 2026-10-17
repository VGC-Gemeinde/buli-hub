# Research: Formen in den Pokémon-Statistiken zusammenfassen

## R1. Where grouping happens

**Decision**: In `toSlots` (`src/features/pokemon-stats/sheets.ts`), right after `resolveMega`: a
slot that is not a Mega gets its counted species from a new pure function `countedSpecies`, and
`entryId`, `name` and `sprite` are derived from that. The species as written (after Mega
resolution) is kept on the slot as `writtenSpecies`.

**Rationale**: Every consumer of a Pokémon entry (ranking, win rates, teammates, carriers, the Mega
filter, the family links) reads `slot.entryId` / `slot.name` / `slot.sprite`. Changing them at the
one place slots are made gives FR-001 everywhere at once, so no consumer can forget it (the same
reasoning as 001's research R5 for Megas). Keeping the written species on the slot is all the breakdown needs. Named `writtenSpecies`, not `forme`: in the dex a forme is only the suffix ("Ocean").

**Alternatives considered**: Grouping inside each ranking and detail function: four places to keep
in sync, and teammates and carriers would be easy to miss. Rewriting the stored sheets: violates
FR-009 (pastes show the forme as written) and would be a migration for a counting rule.

## R2. Recognising a Mega and a battle-only forme

**Decision**: A slot is a Mega when `megaLabel(resolution.spriteSpecies)` is not null, the test the
stats already use (`MEGA_FORME` on the dex forme). A non-Mega species is battle-only when the dex
gives it `battleOnly`; it then counts as the dex's `changesFrom` (a string for every forme).

**Rationale**: Checked in the pinned `@pkmn/dex` on 2026-10-17: `isMega` is unset for Megas that
keep a forme of their own (Meowstic-F-Mega has `isMega: undefined` but `battleOnly:
"Meowstic-F"`), so `isMega` cannot exclude Megas; the forme regex can, and it is already the rule
(`teamsheets/mega.ts`, "matches every one of the 97 megas"). `battleOnly` is an array for a few
formes (Necrozma-Ultra, Zygarde-Complete), while `changesFrom` is always the single forme it
changes from: Palafin-Hero → Palafin, Aegislash-Blade → Aegislash, Castform-Sunny → Castform,
Mimikyu-Busted → Mimikyu, Morpeko-Hangry → Morpeko, Darmanitan-Galar-Zen → Darmanitan-Galar
(which keeps the regional forme, correctly). 39 non-Mega battle-only formes exist in the dex; the
Champions-legal ones are the five above plus the three Castform weathers.

**Alternatives considered**: `baseSpecies`: drops a forme the base keeps (Darmanitan-Galar-Zen
would become Darmanitan). Listing battle-only formes by hand: rejected by the maintainer (spec,
FR-004).

## R3. Shape of the grouping list

**Decision**: `FORME_GROUPS` in a new module `src/features/pokemon-stats/formes.ts`, keyed by base
forme, each with its formes written out by their dex names (19 Vivillon patterns besides the base Meadow,
4 Florges colors, 9 Furfrou trims, 8 Alcremie creams, Sinistcha-Masterpiece, Maushold-Four,
Polteageist-Antique). The lookup is by `toId` of the dex name. A unit test checks that every listed
forme exists in the dex with the listed base as its `baseSpecies`, and that for the four
all-variants species (Vivillon, Florges, Furfrou, Alcremie) the list holds every forme the dex has
(`otherFormes` and `cosmeticFormes`, without Gmax).

**Rationale**: The spec asks for a fixed, hand-maintained list and states that a forme the list
does not name stays separate. Writing the formes out makes each one a reviewed line; the dex test
catches a typo and tells the reviewer when a dex update adds a pattern, without letting it join
silently. A plain record in a pure module is the smallest mechanism (constitution III): no table,
no config.

**Alternatives considered**: "All formes of these species" derived from the dex at runtime:
shorter, but a new pattern would join without review, contradicting the spec's edge case.
A database table: a config table for code-owned rules, rejected by the constitution.

## R4. The breakdown

**Decision**: `pokemonDetail` gains `formes: DistRow[]`, tallied over the entry's appearances by
`slot.writtenSpecies` (id `toId(writtenSpecies)`, name the dex name, sprite the same species),
sorted like every distribution (count, then name). It is empty for a Mega entry (its written
species is the Mega forme, never its base name, so the name rule alone would show a panel) and
when every appearance wrote the entry's own name, which covers ungrouped entries and all-base
selections. The view renders a
`Panel` "Formen" with a `DistList` of box icons, no links, at the top of the right column when
`formes` is not empty (spec UX decisions).

**Rationale**: Reuses `tally` and the existing `Panel`/`DistList` anatomy exactly as the mockup
shows. "Not empty" as the condition keeps the component dumb (constitution I).

## R5. Links to a former forme entry (FR-008)

**Decision**: The detail route (`src/app/statistiken/[kategorie]/[id]/page.tsx`) asks a pure
`groupedEntryId(id)` for the Pokémon category: it resolves the id through the dex, applies the same
rules as `toSlots` (no change for Megas, battle-only, then the list) and returns the grouped entry's
id. When it differs from the requested id, the page redirects (`redirect`, 307) to the grouped
path, carrying the query string as `/statistiken` already does.

**Rationale**: Old links were shared only since 001 shipped (2026-10-16), and a list change may
later ungroup a forme again, so a temporary redirect is right; a permanent one would be cached by
browsers. Reusing `/statistiken`'s query-string copy keeps every filter (FR-008).

**Alternatives considered**: Rendering the grouped detail under the old URL: two URLs for one view,
and the row entries and teammate links would point elsewhere. A 404: worse than today's empty
state.

## R6. What does not change

- `canonicalSpecies` and stored OTS: untouched (FR-009); grouping is read-side only.
- Mega rules, the Mega filter and the family links ("Auch gespielt als"): they read `slot.mega`
  and `slot.name`, which grouping leaves as they are for Megas.
- No schema change, no query change (`countedSheets` returns sheets; slots are made in pure
  code).
- `/dev/ui` gallery: the "Formen" panel is the existing `DistList` with Pokémon icons; one
  gallery example of it is added beside the stats ranking examples so the state is visible there
  (constitution V).
