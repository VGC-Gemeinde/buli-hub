# Feature Specification: Formen in den Pokémon-Statistiken zusammenfassen

**Feature Directory**: `specs/002-pokemon-forme-groups/`

**Created**: 2026-10-16

**Status**: Shipped 2026-10-17

**Input**: User description: "Pokémon-Statistiken: Formen zusammenfassen. In den
Pokémon-Statistiken (specs/001-pokemon-usage-stats) ist heute jede Form, die keine Mega ist, ein
eigener Eintrag, so wie das Sheet sie schreibt. Formen, die sich spielerisch nicht unterscheiden,
sollen künftig als ein Eintrag unter der Grundform zählen." Content decided by the maintainer in
an interview on 2026-10-16 (fixed list, battle-only formes, base name and sprite, breakdown in the
detail).

## User Scenarios & Testing *(mandatory)*

Today the stats (specs/001-pokemon-usage-stats, edge case "Formes that are not Megas ... are
separate entries, as the sheet writes them") split one Pokémon into several entries when sheets
write it in different formes: Sinistcha (65 teams) and Sinistcha-Masterpiece (4) are two rows,
Vivillon is four. These formes play identically, so the split misstates how much a Pokémon is
played and halves the sample its win rate rests on. This feature counts them as one entry under
the base forme, while formes that play differently (regional formes, Rotom, gender formes with
other stats) stay separate.

### User Story 1 - One entry per Pokémon that plays the same (Priority: P1)

A player opens the Pokémon ranking and sees Sinistcha once, with every team that brought it,
whether the sheet wrote "Sinistcha" or "Sinistcha-Masterpiece". The same holds wherever a Pokémon
entry appears in the stats: as a teammate in a Pokémon's detail and as a carrier in an item,
ability or move detail.

**Why this priority**: It is the feature. The ranking is the stats' entry point; a split entry
there gives a wrong rank, a wrong share and a weaker win rate.

**Independent Test**: For a set of counted sheets that write grouped formes in different ways,
every number equals a hand count in which each grouped forme is replaced by its base forme.

**Acceptance Scenarios**:

1. **Given** counted sheets with Sinistcha on 65 teams and Sinistcha-Masterpiece on 4, **When**
   a visitor opens the Pokémon ranking, **Then** there is one entry Sinistcha with 69 teams, its
   share and win rate over all 69, and no entry Sinistcha-Masterpiece.
2. **Given** sheets writing Vivillon, Vivillon-Ocean, Vivillon-Elegant and Vivillon-High Plains,
   **When** the ranking is shown, **Then** they form one entry Vivillon, named and drawn as the
   base forme Vivillon, regardless of which pattern was brought most.
3. **Given** a match in which one team brings Maushold and the other Maushold-Four, **When** win
   rates are computed, **Then** it is a mirror of the one entry Maushold: one win and one loss.
4. **Given** a Pokémon whose teammate is written as Polteageist-Antique, **When** its detail is
   shown, **Then** the teammate appears as Polteageist, merged with teams that wrote Polteageist.
5. **Given** a move carried by Florges-Blue on one team and Florges on another, **When** the move's
   detail is shown, **Then** both count for the one carrier Florges.
6. **Given** sheets writing Indeedee-F, Basculegion-F, Meowstic-F, Lycanroc-Dusk, Rotom-Wash,
   Arcanine-Hisui, Tauros-Paldea-Aqua or Gourgeist-Super, **When** the ranking is shown, **Then**
   each stays its own entry, as today.

---

### User Story 2 - Battle-only formes count as their Pokémon (Priority: P1)

A sheet writes a forme that only exists in battle, such as "Palafin-Hero", the way some sheets
write a Mega directly. The stats count it as the Pokémon the player brought: Palafin.

**Why this priority**: Same defect as Story 1 (one Pokémon, two entries), and the rule mirrors how
the stats already treat a directly written Mega (001, FR-004).

**Independent Test**: For sheets writing each battle-only forme, the slot counts exactly like the
same sheet writing the base forme.

**Acceptance Scenarios**:

1. **Given** sheets with Palafin on 2 teams and Palafin-Hero on 1, **When** the ranking is shown,
   **Then** there is one entry Palafin with 3 teams.
2. **Given** a sheet writing Aegislash-Blade, Castform-Sunny, Mimikyu-Busted or Morpeko-Hangry,
   **When** the stats are computed, **Then** the slot counts as Aegislash, Castform, Mimikyu or
   Morpeko respectively.
3. **Given** a sheet writing a Mega forme, **When** the stats are computed, **Then** the Mega rules
   of 001 apply unchanged (FR-004): a Mega is never folded into its base by this rule.

---

### User Story 3 - See which formes were played (Priority: P2)

A player opens Vivillon's detail and sees how often each forme was brought: "Vivillon 6,
Vivillon-Ocean 2, Vivillon-Elegant 1, Vivillon-High Plains 1." Folding the formes together in the
ranking does not hide what the league actually plays.

**Why this priority**: Chosen by the maintainer as part of the feature; it keeps the information
the split used to show, but only where someone asks for it.

**Independent Test**: For one grouped entry, the forme breakdown equals a hand count of the formes
as written over the counted sheets containing the entry.

**Acceptance Scenarios**:

1. **Given** a grouped entry whose appearances under the current filters include a forme other
   than the base, **When** a visitor opens its detail, **Then** a panel "Formen" shows each forme
   as written, with its box icon and its share among the entry's appearances, adding up to 100 %.
2. **Given** a grouped entry whose appearances under the current filters all wrote the base forme,
   **When** its detail is shown, **Then** no forme breakdown appears.
3. **Given** a filter under which every Vivillon was written as Vivillon-Ocean, **When** the detail
   is shown, **Then** the breakdown appears with the single row Vivillon-Ocean at 100 %.
4. **Given** Palafin with one appearance written as Palafin-Hero, **When** its detail is shown,
   **Then** the breakdown lists Palafin-Hero beside Palafin, like any other forme.
5. **Given** a filter that narrows the counted sheets, **When** the detail is shown, **Then** the
   breakdown counts only the appearances that pass the filters, like every other distribution.

---

### Edge Cases

- A team cannot hold two formes of one group: the species clause allows one Pokémon per species,
  so a sheet counts at most once for a grouped entry, as for any entry.
- A link to a former forme entry (for example `/statistiken/pokemon/sinistchamasterpiece`, shared
  before this feature shipped) leads to the grouped entry's detail, not to "In dieser Auswahl nicht
  gespielt".
- A forme of a listed Pokémon that the list does not name (a new Vivillon pattern in a later
  patch) stays a separate entry until the list names it; the list is maintained by hand, and that
  is its point.
- A battle-only forme the display data does not know yet counts as written, like any unknown
  species (001); once the data knows it as battle-only, it counts as its base.
- A grouped Pokémon that also has a Mega in a later patch: the Mega rules decide first, so a slot
  holding its own stone counts as the Mega whichever forme the sheet wrote; grouping applies to
  slots that are not Megas.
- A Mega whose base keeps a forme of its own (Meowstic-F-Mega, Floette-Mega from Floette-Eternal)
  is unaffected: neither Meowstic-F nor Floette-Eternal is on the list.
- The Pokémon ranking's Mega filter (001, FR-022) is unaffected: grouped entries and folded
  battle-only formes are never Megas.
- Team sheet pages (`/pastes/<uuid>`) and every place outside the stats show the forme as written;
  grouping is a counting rule of the stats only.

## Clarifications

### Session 2026-10-17

- Q: Does a grouped entry show in the ranking that it holds several formes? → A: No; the ranking
  row is unchanged, the breakdown lives only in the detail (FR-006).
- Q: When does the forme breakdown appear in a detail? → A: Only when the appearances under the
  current filters include a forme other than the base; all-base shows none, a single non-base
  forme (every Vivillon as Ocean) shows it (FR-007).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The stats MUST count every forme on the grouping list as its base forme, wherever a
  Pokémon entry is counted: the Pokémon ranking, its win rates, teammates in a Pokémon detail and
  carriers in item, ability and move details.
- **FR-002**: The grouping list MUST be a fixed list maintained by hand in the code, reviewed like
  any other change. It contains exactly:
  - Vivillon: every pattern, including Fancy and Pokeball, grouped under Vivillon.
  - Florges: every flower color, grouped under Florges.
  - Furfrou: every trim, grouped under Furfrou.
  - Alcremie: every cream and sweet, grouped under Alcremie.
  - Sinistcha-Masterpiece under Sinistcha.
  - Maushold-Four under Maushold.
  - Polteageist-Antique under Polteageist.
- **FR-003**: Every forme not on the list and not battle-only MUST stay its own entry, as written in
  the sheet (001's behavior). This explicitly includes regional formes, Rotom's formes,
  Basculegion-F, Meowstic-F, Indeedee-F, Lycanroc's formes, Tauros-Paldea's breeds and Gourgeist's
  sizes.
- **FR-004**: A forme that the display data marks as battle-only, other than a Mega, MUST count as
  the base forme it changes from (Palafin-Hero as Palafin, Aegislash-Blade as Aegislash,
  Castform-Sunny/-Rainy/-Snowy as Castform, Mimikyu-Busted as Mimikyu, Morpeko-Hangry as Morpeko).
  This follows the data, not the list, so a battle-only forme added later needs no list entry.
- **FR-005**: Megas MUST be resolved by 001's rules (FR-004, FR-027, FR-028) before any grouping;
  grouping never turns a Mega into its base, and never changes which slot is a Mega.
- **FR-006**: A grouped entry MUST carry the name and sprite of its base forme, independent of
  which forme was brought most. Its ranking row looks like every other row: no marker or count of
  formes; the breakdown is reached through the detail only (FR-007).
- **FR-007**: A grouped entry's detail MUST show a forme breakdown when its appearances under the
  current filters include a forme other than the base: a panel "Formen" listing each forme by its
  full name as written in the sheets (after Mega resolution, e.g. "Vivillon-Ocean"), with its box
  icon and its share among the entry's appearances, adding up to 100 %.
  Win rates per forme are not shown, as for every other distribution in a detail (001,
  Assumptions).
- **FR-008**: A link to the detail of a forme that is now grouped MUST lead to the grouped entry's
  detail, with the link's filters kept.
- **FR-009**: Grouping MUST NOT change anything outside the stats: team sheet pages, stored sheets,
  the stream API and Discord show the forme as written.

### Key Entities

- **Grouping list**: the hand-maintained mapping from a forme to the base forme it counts as
  (FR-002). Part of the code, not of the database.
- **Battle-only forme**: a forme the display data marks as existing only in battle; folded into
  its base by FR-004 unless it is a Mega.
- **Pokémon entry** (extends 001): a species as written, its Mega when it holds its own stone, or
  the base forme of a group or battle-only forme.
- **Forme breakdown**: per grouped entry, the formes as written with count and share among the
  entry's appearances (FR-007).

## UX & Mockups *(mandatory when users see a change)*

**Status**: Approved 2026-10-17

**Explanation level**: Display page, layout speaks, as in 001: the forme breakdown is one more
distribution in the Pokémon detail and needs no explanation for competitive players.

| View | Route | Who sees it | Mockup file |
|------|-------|-------------|-------------|
| Pokémon detail with forme breakdown | `/statistiken/pokemon/<id>` | public | mockups/pokemon-detail.html |

The rankings change only in their numbers (fewer, larger entries); their anatomy stays as 001
approved it, so they need no new mockup. The mockup is built on 001's approved one (whose
rankings it carries along for comparison) and shows desktop and phone width, light and dark, and
the states: Vivillon with four formes, Sinistcha with a rare Masterpiece, Palafin with Hero, a
filter with only Vivillon-Ocean (one row at 100 %), a filter with only the base forme (no panel),
and Mega Charizard Y for comparison.

**UX decisions**:

- The breakdown is a panel "Formen" at the top of the detail's right column, above "Item", with
  the same anatomy as every distribution there (`Panel`, `DistList`): box icon, name, share, bar.
  Its rows are not links; a forme has no detail of its own. Chosen over a line "Gespielt als ..."
  in the header beside "Auch gespielt als", because for Vivillon the icons carry the information
  (maintainer, 2026-10-17).
- Formes are labelled with their full name as the sheet writes it ("Vivillon-Ocean",
  "Sinistcha-Masterpiece"), the base forme with the plain species name ("Vivillon"). Rejected:
  the forme name alone, which would surface Showdown's base forme names ("Meadow",
  "Unremarkable", "Zero") that players do not use.
- Rows are ordered by count, ties alphabetically, like every distribution.
- The panel and "Auch gespielt als" never meet: no grouped Pokémon has a Mega in Champions; should
  one get one, both appear, each in its own place.
- The panel appears or not with the selection; a filter change is a page load, so this is no
  relayout on a state change (constitution, Principle V).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the current season's data, Sinistcha, Maushold, Vivillon and Palafin each appear
  exactly once in the Pokémon ranking, with counts equal to the sum of their formes (66, 12, 9 and
  3 counted teams in the local clone of 2026-10-16; the raw sheet counts are 69, 13, 10 and 3, the
  difference being sheets of matches that are not rated and so not counted since 001's last
  change).
- **SC-002**: For every forme on the list and every battle-only forme, tests show that a sheet
  writing it produces the same numbers as the same sheet writing the base forme, everywhere a
  Pokémon entry is counted.
- **SC-003**: For every forme named in FR-003, tests show it stays a separate entry.
- **SC-004**: A visitor finds how often each Vivillon pattern was brought within two interactions
  from the Pokémon ranking, on desktop and on phone width.

## Assumptions

- The list covers the Pokémon legal in Pokémon Champions as of 2026-10-16 (checked against the
  Champions format data). Tatsugiri, Squawkabilly and Dudunsparce, whose formes would raise the
  same question, are not legal in Champions and are left off; a patch that adds them is a list
  change, decided then (Tatsugiri's formes play differently through Commander).
- The maintainer chose a fixed list over an automatic "identical in the data" criterion: it keeps
  the judgment calls (Gourgeist's sizes differ slightly, Tatsugiri differs only in Commander)
  explicit and reviewable. Battle-only formes are the exception, because the data marks them
  unambiguously and the stats already rely on the same data for Megas.
- The breakdown counts formes after Mega resolution; since no grouped Pokémon has a Mega in
  Champions today, this only matters for a future patch.
- No schema change, no migration, no Discord change: grouping is a pure counting rule over the
  stored sheets, applied on every page load (001, FR-006).
- 001 is frozen; this spec supersedes its edge case "Formes that are not Megas ... are separate
  entries, as the sheet writes them" and receives a backlink note when this feature ships.
