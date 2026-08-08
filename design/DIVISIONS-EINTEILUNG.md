# Buli Hub — Divisions-Einteilung (design handoff)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still valid),
`SIGNED-IN.md` and `STAFF-BEREICH.md`. This doc is the design pass over the
seeding feature against current `main` (de205a7): the `/staff/seeding` page,
config, placement, sub-division generation, and publish. Domain logic
(`seeding.ts`, `placement.ts`, `generate-sub-divisions.ts`, queries, actions)
is correct as-is; **only views change**. Reference design: project file
**"Divisions-Einteilung v2.dc.html"** (interactive — drag, selects, bulk bar,
generate and publish all work with 180 demo players).

The core idea: the stacked sections (Konfiguration / Divisionen / Spieler
einteilen / Gruppen / Veröffentlichen) become **one continuous sheet** — every
player is a row with all placement signals readable as columns; divisions and
sub-divisions are **separator rows inside the sheet**. Staff see the entire
seeding at once and edit it in place. `StaffSectionHeader` is not used on this
page anymore.

---

## 1. Page layout (`staff/seeding/page.tsx`)

Desktop-only staff tool — optimize for big screens, no mobile adaptation:

- Full-width workspace, **no 960px column**. Root:
  `flex h-screen min-w-[1520px] flex-col overflow-hidden` — smaller windows get
  horizontal scroll instead of a squeezed grid.
- Site chrome unchanged: orange accent line + `SiteHeader`.
- Below: two fixed toolbar rows (§2), then the sheet as the flex-1 scroll
  region (§3). The page never scrolls; only the sheet does.
- Guards unchanged: staff+ role, window `closed`, otherwise the existing
  redirect/hint (`Die Einteilung ist erst möglich, sobald die Anmeldung
  geschlossen ist.` — keep, rendered in the plain shell).
- Edge state, 0 registrations: sheet shows only the *Nicht platziert* separator
  with `0 Spieler` and a hint row `Keine Anmeldungen für diese Saison.`
  (`text-muted-foreground text-sm`, like today).

## 2. Toolbar (replaces ConfigForm + PublishPanel placement)

### Title row

```tsx
<div className="flex items-center gap-7 px-7 pt-4 pb-3">
  <div className="flex min-w-0 items-center gap-3">
    <div className="h-[11px] w-[22px] -skew-x-[18deg] bg-brand-orange" />
    <h1 className="whitespace-nowrap text-[28px] leading-none text-brand-blue dark:text-white">
      Divisionen einteilen
    </h1>
    <span className="pt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      Saison 1
    </span>
  </div>
  <div className="flex-1" />
  <Meter label="Platziert" value={placed} total={total} fill="bg-brand-orange" />
  <Meter label="In Gruppen" value={grouped} total={total} fill="bg-brand-blue" />
  <Button disabled={!ready} title={gateHint}>Veröffentlichen</Button>
</div>
```

- `Meter`: `w-[130px]`, label row `text-[11.5px] font-semibold uppercase
  tracking-[0.06em] text-muted-foreground` with the value right-aligned in
  foreground (`{n}/{total}`), above a 5px `bg-muted rounded-full` track,
  fill width `n/total`. In dark mode the blue fill needs contrast:
  `dark:bg-white/80` for the In-Gruppen meter.
- Publish gate: existing `seedingReadiness`. Disabled `title`:
  `Erst möglich, wenn alle Spieler platziert ({placed}/{total}) und in Gruppen
  ({grouped}/{total}) sind.` Enabled `title`: `Endgültig — kann nicht
  rückgängig gemacht werden.`
- Published: button is replaced by a chip — tick (`h-2 w-4 -skew-x-[18deg]
  bg-brand-orange`) + **Veröffentlicht — endgültig** in
  `rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-3 py-1.5
  text-[13.5px] font-semibold`.

### Control row

```tsx
<div className="flex items-center gap-5 border-b px-7 pb-3">
  <div className="flex items-center gap-2">
    <Label className="text-[13px] text-muted-foreground">Divisionen</Label>
    <Input type="number" min={1} max={20} className="h-7 w-14" ... />
  </div>
  <div className="flex items-center gap-2">
    <Label className="text-[13px] text-muted-foreground">Gruppengröße</Label>
    <Input type="number" min={2} max={24} className="h-7 w-14" ... />
    <span className="text-[12.5px] text-muted-foreground">→ {size - 1} Spieltage</span>
  </div>
  <Button variant="outline" size="sm">Alle Gruppen generieren</Button>
  <div className="flex-1" />
  <Input placeholder="Spieler suchen…" className="h-7 w-[220px]" ... />
  {/* filter pills: Alle / Rückkehrer / Neu */}
</div>
```

- Config saves on change via existing `configureSeeding` (debounce; no
  Speichern button). Validation errors from the existing Zod schema
  (`Ungültige Zahl`, `Mindestens {n}`, `Höchstens {n}`) render inline after the
  input: `text-destructive text-[12.5px]`. The long explainer paragraph is
  dropped — the Spieltage hint and the division separators carry the same
  information in context.
- Reducing the division count moves players from removed divisions back to
  *Nicht platziert* (confirm-free; it's undoable by re-adding).
- **Alle Gruppen generieren** runs generate for every division with players;
  per-division generation lives on the separators (§3.1). Pending label:
  `Wird generiert…` (existing convention).
- Filter pills: `h-6.5 rounded-full px-2.5 text-[12.5px] font-medium`, active
  = `bg-brand-blue text-white dark:bg-white dark:text-brand-blue`, inactive =
  `border text-muted-foreground`. Search + filter hide non-matching **player
  rows only** — separators and their (unfiltered) counts stay, so structure
  never jumps. All rows filtered out ≙ sections simply appear empty; no extra
  empty-state UI.
- Action errors (any server action): one line under the toolbar,
  `text-destructive text-sm`, same pattern as today's components.

## 3. The sheet

One vertical scroll container. Sticky column header (`sticky top-0 z-10
bg-background border-b`, 34px): `text-[11px] font-semibold uppercase
tracking-[0.08em] text-muted-foreground` — `(checkbox) · Spieler · Status ·
Plattform · Letzte Saison · Hinweis · Einschätzung · Erfolge · Division ·
Gruppe`.

**Column grid** — one constant shared by header and player rows
(`px-7 pl-5` outer padding):

```ts
const SHEET_GRID =
  "grid-cols-[36px_minmax(190px,1.3fr)_100px_110px_170px_150px_130px_minmax(170px,1fr)_150px_110px]";
```

### 3.1 Row types, in sheet order

**1 — *Nicht platziert* separator** (always first):

```tsx
<div className="flex h-10 items-center gap-3 border-b bg-muted/40 py-0 pr-7 pl-5">
  <div className="h-2.5 w-5 -skew-x-[18deg] bg-brand-orange" />
  <span className="font-heading text-lg font-bold uppercase tracking-[0.04em] text-brand-blue dark:text-white">
    Nicht platziert
  </span>
  <span className="text-[12.5px] text-muted-foreground">
    {n} Spieler · Rückkehrer zuerst, dann nach Selbsteinschätzung
  </span>
</div>
```

**2 — Division separator**, one per division — the navy anchor rows that chunk
180 rows into scannable sections:

```tsx
<div className="flex h-10 items-center gap-3 bg-brand-blue pr-7 pl-5 dark:bg-[oklch(0.26_0.06_265)]">
  <div className="h-2.5 w-5 -skew-x-[18deg] bg-brand-orange" />
  <span className="font-heading text-lg font-bold uppercase tracking-[0.04em] text-white">
    {divisionName(tier)}
  </span>
  <span className="text-[12.5px] text-white/60">{meta}</span>
  <div className="flex-1" />
  {hasGroups
    ? <Button size="sm" className="border-white/30 bg-white/10 text-white hover:bg-white/20">Neu generieren</Button>
    : <Button size="sm">Gruppen generieren</Button>}
</div>
```

`meta`: before generation `{n} Spieler · → {k} Gruppen bei Größe {size}`
(`k = ceil(n/size)`); after `{n} Spieler · {k} Gruppen`. Generate button only
when the division has players.

**3 — Gruppen separator** (after generation, one per sub-division):
`flex h-8 items-center gap-2.5 border-b bg-muted/60 pr-7 pl-9` — condensed
**{subDivisionName(tier, position)}** (`text-[14.5px] font-bold uppercase
text-brand-blue dark:text-white`) + meta `text-xs text-muted-foreground`:
`{n} Spieler · {x} Showdown / {y} Cartridge`.

**4 — *Ohne Gruppe* separator** (only when a division has generated groups AND
ungrouped players — e.g. someone moved in afterwards): like a Gruppen
separator, warning-toned — `bg-brand-orange/5`, title in amber
(`text-[oklch(0.55_0.13_50)]`), meta `{n} Spieler · per Gruppen-Spalte oder
Ziehen zuordnen`.

**5 — Empty-division hint row** (0 players): `flex h-9 items-center border-b
pl-13 text-[13px] text-muted-foreground/70` — *Keine Spieler · Zeilen hierher
ziehen oder die Division-Spalte nutzen*

**6 — Player row**:

```tsx
<div draggable className={cn("grid h-9.5 select-none items-center border-b border-border/60 pr-7 pl-5",
  SHEET_GRID, selected && "bg-brand-orange/5", "cursor-grab")}>
  <Checkbox className="size-[15px]" />                            {/* accent = orange via --primary */}
  <div className="flex min-w-0 items-center gap-2">
    <Avatar className="size-6">…initials fallback…</Avatar>
    <span className="truncate text-[13.5px] font-medium">{name}</span>
  </div>
  <Badge variant={returning ? "secondary" : "outline"}>{returning ? "Rückkehrer" : "Neu"}</Badge>
  <div className="flex items-center gap-1.5 text-[13px]">
    <span className={cn("size-[7px] rounded-full", dotClass)} /> {platformShort}
  </div>
  <span className="text-[13px]">{prevLine}</span>   {/* or dash */}
  <CaveatChip … />                                  {/* or empty */}
  <RatingCell … />                                  {/* or dash */}
  <span title={achievements} className="truncate pr-3.5 text-[13px]">{achievements}</span> {/* or dash */}
  <Select … />                                      {/* Division */}
  <Select … />                                      {/* Gruppe */}
</div>
```

Cell specs:

- **Spieler** — avatar `size-6`, `AvatarImage` if `avatarUrl`, fallback
  initials `text-[10px] font-semibold`; name truncates. Fallback name chain as
  today: `displayName ?? username ?? "Unbekannt"`.
- **Status** — `Badge variant="secondary"` **Rückkehrer** / `variant="outline"`
  **Neu** (stock shadcn badges, `text-[11.5px]`).
- **Plattform** — 7px dot + short label. Showdown: dot `bg-chart-3`, label
  **Showdown**. Cartridge: dot `bg-brand-orange/80`, label **Cartridge**.
  (Short forms of the `PLATFORM_LABELS` — full labels don't fit a column and
  add nothing here.)
- **Letzte Saison** — returning only: `Division {prevDivision} ·
  {prevPlacement}. Platz`, `text-[13px]`. `prevDivision`/`prevPlacement` are
  free text from registration — render verbatim, truncate, full value in
  `title`. New players: `—` in `text-muted-foreground/50` (the dash is the
  standard empty-cell treatment for every column below too).
- **Hinweis** — renders `seedingCaveats(player)`, one chip
  (`text-[11.5px] font-semibold rounded-md px-1.5 py-px whitespace-nowrap`):
  - `self_reported` → **Selbst angegeben** — `border-[1.5px] border-dashed
    text-muted-foreground` (today's only computable caveat; every returning
    player carries it in Saison 1 — that's correct, not noise: it reminds staff
    the whole column is unverified).
  - Future kinds (arrive with the standings feature; design now so the column
    doesn't reflow later): **Bestätigt** — solid chip
    `border-[oklch(0.85_0.06_150)] bg-[oklch(0.975_0.02_150)]
    text-[oklch(0.45_0.1_150)]`; **Ältere Saison ({season})** — dashed amber
    chip `border-[oklch(0.8_0.1_50)] text-[oklch(0.55_0.13_50)]`. (No green
    token exists in DESIGN.md §1 — these are deliberate arbitrary values;
    revisit if more success/warning states appear elsewhere.)
- **Einschätzung** — new players only: `{skillSelfRating}/10`
  (`text-[12.5px] font-semibold`) + mini bar `h-1 w-[52px] rounded-full
  bg-muted` with `bg-brand-orange` fill at `rating × 10%`.
- **Erfolge** — new players only: `greatestAchievements` from registration,
  truncated, full text in `title`. Nullable — dash when absent.
- **Division select** — shadcn `Select`, `h-7 w-[136px]`, options *Nicht
  platziert* + `divisionName(1…n)`. Calls existing `assignToDivision`;
  optimistic update with rollback + inline error, exactly like today's
  `PlacementList`. Moving divisions clears the sub-division (existing server
  behavior).
- **Gruppe select** — `h-7 w-[96px]`, options `—` + the division's
  sub-divisions labelled `{tier}{letter}` (short form of `subDivisionName`).
  Disabled (`opacity-55`) while unplaced or before generation. Calls existing
  `moveToSubDivision`.

Row hover: `hover:bg-muted/40` (helps tracking across ten columns).

### 3.2 Zeilen verschieben — three equivalent paths

Controls are the source of truth (keeps the plan's control-based decision,
keyboard-accessible); drag is a progressive enhancement — nothing is only
reachable by drag:

1. **Selects** (Division / Gruppe column) — always work.
2. **Drag-and-drop** — every player row `draggable`. Drop targets: any
   separator (assigns that division; a Gruppen separator assigns that group;
   *Nicht platziert* unassigns) and any player row (adopts that row's division
   + group). Feedback: separators get `shadow-[inset_0_0_0_1.5px]
   shadow-brand-orange`, player rows an inset 2px bottom line in orange;
   dragging a row that is part of the checkbox selection drags the whole
   selection. HTML5 DnD, no library — desktop-only tool, mobile pitfalls
   don't apply.
3. **Bulk bar** (§4) for many-at-once.

## 4. Bulk action bar

Floating bottom-center while ≥1 checkbox is set:

```tsx
<div className="absolute bottom-4.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3
  rounded-xl bg-brand-blue px-3.5 py-2 text-white shadow-lg">
  <span className="text-[13.5px] font-semibold">{n} ausgewählt</span>
  <span className="text-xs text-white/60">verschieben nach</span>
  {/* one 26px square button per division: 1…n, border-white/30 bg-white/10,
      title={divisionName(t)} — plus "—" for Nicht platziert */}
  <button className="text-[12.5px] text-white/60">Aufheben</button>
</div>
```

Assignment clears the selection. Selection state is per-page, not persisted.

## 5. Ordering rules (all existing domain fns — no new logic)

- *Nicht platziert*: `orderForPlacement` (returning first, then self-rating
  desc, stable).
- Division without groups: same ordering.
- Within a sub-division: name, `localeCompare("de", { sensitivity: "base" })`
  (the player-grid convention from `STAFF-BEREICH.md` §4).
- Generation: existing `generateSubDivisions` (≤1 size difference, platform
  soft-grouping) — per division via the separator button, or all at once (§2).

## 6. Veröffentlichen

Existing `PublishPanel` semantics, relocated — the dialog itself is unchanged:
title **Einteilung veröffentlichen?**, description with `SEASON_NAME` bold,
type-to-confirm via `matchesConfirmationPhrase`, footer **Abbrechen** /
**Veröffentlichen** (disabled until match), pending label **Wird
veröffentlicht…**.

Published (terminal) state — the sheet stays as the read-only record:

- Toolbar: publish button → published chip (§2); config inputs, search/filter
  and **Alle Gruppen generieren** hidden; meters stay (both full).
- Sheet: checkbox column empty, selects rendered as plain text
  (`Division {tier}` / `{tier}{letter}`), generate buttons gone, rows not
  draggable, no hover cursor.
- Above the sheet, the existing notice pattern: `rounded-lg border
  border-brand-orange/40 bg-brand-orange/5 px-4 py-3 text-sm` — `Die
  Einteilung wurde am {publishedAt} veröffentlicht und ist endgültig.`
  (`de-DE`, `dateStyle: "long"` + `timeStyle: "short"`, as today).

## 7. Dark mode

- Player rows `bg-background`, separators as specified (`bg-muted/40|60`
  resolve via tokens; division separator gets the explicit dark navy
  `dark:bg-[oklch(0.26_0.06_265)]` so it still reads darker than the page).
- Condensed titles on light separators: `text-brand-blue dark:text-white`
  (the standing convention).
- Orange stays orange (both modes, per DESIGN.md); the In-Gruppen meter fill
  and bulk-bar background swap to white-based (`dark:bg-white/80`,
  `dark:bg-[oklch(0.26_0.06_265)]`).

## 8. Component slicing (replaces the four current view components)

```
features/seeding/components/
  seeding-toolbar.tsx   # title row + control row (config, search, publish gate)
  seeding-sheet.tsx     # scroll container, sticky header, row assembly
  sheet-rows.tsx        # separators, empty-hint, PlayerRow
  bulk-bar.tsx          # floating selection bar
  publish-dialog.tsx    # logic unchanged from publish-panel.tsx
```

Row assembly (players + divisions + sub-divisions → ordered, typed row list)
is a **pure function** — unit-test it like the other domain logic (empty
season, division without groups, ungrouped stragglers, filter interaction).

## 9. Checklist

1. `staff/seeding/page.tsx`: full-width workspace shell, guards + edge states (§1)
2. `seeding-toolbar.tsx`: title row, meters, publish gate, inline config with
   Zod errors, search/filter (§2)
3. `seeding-sheet.tsx` + `sheet-rows.tsx`: sticky header, six row types,
   `SHEET_GRID`, all cell specs (§3)
4. Selects → `assignToDivision` / `moveToSubDivision` with optimistic
   update + rollback; drag-and-drop + bulk bar layered on top (§3.2, §4)
5. `publish-dialog.tsx` relocation + read-only published state (§6)
6. Both modes verified (§7)
7. Dev gallery: separator variants, player-row variants (returning/new, each
   caveat, published) + persona/seed helper for a closed window with N players
   (dev-tooling convention)
8. `npx biome check --write .`, `npx tsc --noEmit`, `npm test -- --run`
