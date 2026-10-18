# design-sync notes — buli-hub → Claude Design System artifact

**Target since 2026-10-18:** the Design System artifact **VGC Gemeinde Design
System**, https://claude.ai/artifact/MWNaiDiio2n81VAYY6Pbx9. It was migrated
(the Claude Design "migrate" button) from the standalone claude.ai/design project
`10803020-3e43-41f1-80f1-029698d498ad`, which closes by 2026-12-14 and is no
longer synced; `config.json`'s `projectId` still names that old project only
because the converter reads it. First sync: 2026-07-27. Shape: `package` (no
Storybook anywhere in the repo).

## Syncing to the artifact (since 2026-10-18)

The converter (`/design-sync` skill, staged into `.ds-sync/`) still builds and
grades everything; only the last step changed. `.design-sync/to-system.mjs`
turns its output into the artifact's files, reproducing byte for byte what the
migration made of the old layout (verified against the migration's own
before/after pairs), so an update changes only what the code changed.

1. Build, validate, capture, grade as below (commands under "Environment").
2. Read the artifact back: `project/README.md` and `project/design-system.json`
   (Artifact tool, `action: "read"`). Check the index's `lastChange`: if it is
   not ours, someone edited on the page; read and merge their files first.
3. `node .design-sync/to-system.mjs --sys <dir with that README.md> --out <stage>`
   writes `<stage>/project/...` (components, `_preview/`, bundle, guidelines,
   README with the system's own header kept) and `<stage>/removed.json`.
4. Tokens are NOT generated: the artifact owns `tokens.json` (the page edits it).
   When `globals.css` gains or changes a token, edit `tokens.json` by hand (a list
   per family, a usage note with contrast per token) and rewrite `tokens.css` in
   the page's compiled layout (one `--name: value; /* usage */` line in the first
   theme block, dark values under `[data-theme="dark"]`). `bundle.css` loses the
   token blocks (`lift()` in to-system.mjs), so a token missing from `tokens.json`
   is missing everywhere.
5. Publish with the Artifact tool to the URL above: `root` = `<stage>`, at most
   255 paths per call, `removed.json` paths as `null`, and the index
   `project/design-system.json` (re-read, `lastChange` set) in the LAST call.
6. There is no `_ds_sync.json` anchor any more: grades live only in the local
   gitignored `.cache/review/`. A fresh machine re-grades everything.

## Why this repo needs extra wiring

buli-hub is a **Next.js app**, not a published component package: `private: true`,
no `main`/`module`/`exports`, no `dist/`. Three things the converter normally reads
off a built package are produced by `.design-sync/prepare-css.mjs` instead
(wired as `cfg.buildCmd`, so a re-sync regenerates them):

- **`cfg.entry`** → `.design-sync/.cache/entry.mjs`, generated from the unique
  paths in `cfg.componentSrcMap`. The map is the single source of truth for scope.
  `export *` also puts each file's subparts (`DialogContent`, `SelectItem`, …) on
  `window.VgcGemeinde` even though only mapped names get preview cards.
- **`cfg.cssEntry`** → `.design-sync/.cache/css/ds.css`. `src/app/globals.css` is
  Tailwind v4 *source* (`@import "tailwindcss"`) and cannot ship as-is, so the
  script runs the Tailwind CLI over **`.design-sync/ds-entry.css`** — a wrapper
  that imports globals.css untouched and adds the `@source` roots and the
  `@source inline(...)` safelist. The safelist is load-bearing, not decoration:
  compiling globals.css directly yielded only the classes buli-hub happens to use,
  so ordinary layout utilities (`p-6`, `grid-cols-3`, `w-64`) were absent and any
  new layout the design agent built collapsed silently. See Re-sync risks.
- **Font variables + self-hosted Montserrat.** The app gets Montserrat from
  `next/font`, which exists only inside Next's build. In the bundle
  `--font-sans` would be the self-referential `var(--font-sans)` and every design
  would render in a fallback face. The script downloads Montserrat woff2
  (latin + latin-ext, weights 400/500/600/700/800) into `.design-sync/fonts/`
  (committed — a re-sync needs no network), emits `.design-sync/fonts.css`
  (`cfg.extraFonts`), and defines both font vars at the top of `ds.css`.

## Environment: playwright/chromium on this machine (WSL2, Ubuntu 24.04)

The render check and the grading capture both need chromium. Two gotchas, both solved:

- **Version pin.** `~/.cache/ms-playwright/` holds `chromium-1228`, which is pinned
  by **playwright 1.61.0** — not by any version you'd guess from the repo (the repo
  has no playwright dep at all). Installed into `.ds-sync` with
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` so it reuses the cache.
- **Missing system libs, no root.** The cached browser failed to launch with
  `libnspr4.so: cannot open shared object file`. `sudo` needs a password here, so
  the four missing libs (`libnspr4`, `libnss3`, `libnssutil3`, `libasound2`) were
  installed **without root**: `apt-get download` (needs no root) + `dpkg-deb -x`
  into `/home/kuro/.local/pw-deps`. Every validate/capture run therefore needs:

  ```sh
  export LD_LIBRARY_PATH=/home/kuro/.local/pw-deps/usr/lib/x86_64-linux-gnu
  ```

  Without it you get `Target page, context or browser has been closed`, which
  looks like a crash but is really a missing-library error — check the
  `[pid=…][err]` line in the browser logs.

## Environment: playwright/chromium on a Nix machine (NOT the WSL2 one above)

A later re-sync ran on a **Nix-based machine** (`/nix/store/...`, `/etc/profiles/per-user`),
where the WSL2 fix above does **not** apply:

- The playwright-cached `chromium-1228` binary is FHS-linked and misses ~24
  shared libs on Nix (`libglib-2.0`, `libnss3`, `libcairo`, `libX11`, …) — the
  4-lib `pw-deps` trick is not enough, and there is no root. Launch fails with
  `Target page, context or browser has been closed`.
- Fix: use the **system Nix chromium** via the scripts' `DS_CHROMIUM_PATH`
  override (honoured by `package-validate.mjs`, `package-capture.mjs`, and the
  storybook probes):

  ```sh
  export DS_CHROMIUM_PATH="$(readlink -f "$(which chromium)")"   # Chromium 150 on nix
  ```

  Still install `playwright@1.61.0` in `.ds-sync` (with
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`) for the client library; only the browser
  binary is swapped.
- **Render churn is expected across machines.** The render browser here
  (Chromium 150) differs from whatever produced the uploaded anchor (playwright
  pins ~1228), so `renderHashes` shift for many untouched components and the
  driver reports `trigger: "render_churn"`. That is benign pixel noise — grade
  the sheets (they render clean, 0 bad) and move on. A sync run from a different
  chromium will always re-churn; it is not a real change.

## Scope: 96 components (since 2026-10-18; 49 at first sync)

The 2026-10-18 sync added 48 components that appeared since July (navigation,
staff shell, standings, favorites, playoffs, MotW candidates, recordings, stream
photos, Pokémon stats, usage, Regelwerk) and removed `MotwTodoCard` (deleted
from the app). Taint-checked with a per-file esbuild browser bundle: a file whose
closure fails (`net`, `@opentelemetry/api`) reaches a server action and stays out
(`StaffPage`, `FavoritesView`, `RegistrationForm`, `WeekMatches`, `SiteHeader`,
`UserMenu`, every dialog with an action, ...). `ReportSummary` reaches
`db/schema.ts` (via `registration.ts` `PLATFORM_LABELS`), which only pulls
`drizzle-orm/pg-core`: browser-safe, just weight.

**`EntryDetailView` and `PokemonDetailView` are excluded on size**: they compute
their view from `@pkmn/dex` + `@pkmn/mods` (19.7 MB), which took the bundle to
21.6 MB against the artifact's 6 MB cap. Everything else in pokemon-stats takes
precomputed view models and bundles fine (2.7 MB total).

Subparts that come along with a mapped file (`StandingsPanel`, `MatchRow`,
`InfoTooltip`, `NextAppRouter`, ...) are `null` in `componentSrcMap`.

### First sync (2026-07-27): 49 of 65 candidates

Scoped in: all 15 `src/components/ui` primitives, the brand/shared components
(`Tick`, `SectionHeader`, `EmptyStateCard`, `PlayerGrid`, `TypeToConfirm`,
`DatePicker`, `TimePicker`, `DateTimePicker`, `ActionLink`, `InlineLink`), and the
feature components the `dev/ui` gallery demonstrates.

Four components were only found on a second pass, hiding among what looked like
subparts once the root `index.d.ts` made real exports visible: `DatePicker`,
`TimePicker` (siblings of `DateTimePicker` in the same file), `ProfileSchedule`
(a second export beside `ProfileSpielplan`) and `SpoilerPill` (beside
`SpoilerScore`). The other 40 newly-visible names ARE genuine subparts
(`DialogContent`, `SelectItem`, …) and are `null` in `componentSrcMap`: they ride
on `window.VgcGemeinde` for composition but get no card of their own.

**16 components are excluded because they reach Next server actions.** Their
transitive value-import closure hits a `"use server"` module, which drags
`postgres`/`drizzle-orm`/`@supabase/*`/`next/cache` into the browser bundle and
fails the esbuild step outright (`[UNRESOLVED_IMPORT] net, tls, crypto, …`).
Next replaces server-action imports with RPC stubs inside its own compiler; a
plain esbuild bundle follows the real module. Excluded:

`CreateScheduleDialog`, `DisputeDialog`, `DisputeResolveDialog`, `DropsSection`,
`MotwManager`, `ProfileHint`, `ProfileStaffPanel`, `RegistrationConfirmation`,
`ReportForm`, `SaisonDashboard`, `SaveIndicator`, `SeasonCard`,
`SeedingInitLoader`, `SignInButton`, `StaffResultEditor`, `UserMenu`

Three of those (`ProfileStaffPanel`, `RegistrationConfirmation`, `SeasonCard`)
are only *transitively* tainted — via `drops-section`, `withdraw-button` and
`open-registration-form` respectively.

**To include them in a future sync**, the app-side fix is to make the server
action an injected prop (`onSubmit`) with the action as the default at the call
site, so the presentational component no longer imports the action module. That
is an app refactor, deliberately not done as part of this import.

## Authoring previews in this repo

- **Type-check previews before capturing.** esbuild compiles previews by
  *stripping* types, never checking them, so a fixture with the wrong shape
  builds fine and then renders a blank card — costing a full build+capture cycle
  to discover. `.design-sync/tsconfig.previews.json` checks them in seconds and
  maps `buli-hub` → the generated root `index.d.ts`, so previews are checked
  against the real props:

  ```sh
  npx tsc -p .design-sync/tsconfig.previews.json
  ```

  This is how the `MotwBlockData` mistake was caught: it *wraps* a `PublicMatch`
  (`{match, groupName, youtubeUrl, rankA, rankB}`) rather than flattening it, and
  the flattened version rendered an empty PublicLeague card.
- **`.design-sync/previews/_fixtures.ts`** holds the shared mock data, ported
  from the repo's own `dev/ui` gallery. The leading underscore keeps it out of
  the converter's `<ComponentName>.tsx` namespace, so it is never treated as a
  preview. Take TYPE-only imports from feature modules there; a value import
  from anything reaching a `"use server"` module breaks the whole build.
- **The `dev/ui` gallery is the authoring source.**
  `src/features/dev/components/gallery.tsx` (1872 lines) already exercises almost
  every component with realistic German mock data — port from it rather than
  inventing. It is also why this DS could be authored at all without a Storybook.
- **Changing `cfg.overrides` requires a full `package-build.mjs`.** A scoped
  `preview-rebuild.mjs` will refuse with `[CONFIG_STALE]` because the full build
  is what re-stamps the grade keys. This is the main reason preview-authoring
  subagents must not edit the config.
- **Never call `new Date()` in a preview** — a moving date changes the render
  hash on every run and defeats the re-sync cache.
- **The capture pins the browser clock to 2024-05-15.** A `Calendar` with no
  explicit `defaultMonth`/`today` opens on May 2024 and highlights the wrong
  "heute" — it reads as broken rather than stale. Pass both anchors explicitly.
- **A Tailwind class the app itself never uses does not exist, and fails
  silently** (the element just renders unstyled). `preview-rebuild.mjs` does not
  re-run `buildCmd`, so a utility invented for a preview is never compiled.
  Mitigated by the safelist in `.design-sync/ds-entry.css`, but **arbitrary
  values can never be safelisted** — `w-[620px]`, `gap-[13px]` and friends will
  still silently do nothing. Use the named scale, and `max-w-*` for page widths.
  **Run `node .design-sync/check-classes.mjs`** — it verifies every class in
  every authored preview against the compiled sheet. Do NOT hand-grep the class
  name: CSS escapes everything outside `[A-Za-z0-9_-]`, so `gap-1.5` is stored as
  `.gap-1\.5` and `w-[80px]` as `.w-\[80px\]`, and a naive grep reports a present
  class as missing (this produced real false negatives during wave 1).
- **`cardMode:"single"` shows only ONE export** in the product card, and it is
  the **alphabetically first** one — not the source-first one. `emit.mjs`
  enumerates with `for (var k in window.__dsPreview)` and esbuild emits that
  export map alphabetically. The capture still grades every cell via `?story=`.
  Pin `overrides.<Name>.primaryStory` (done for `DropdownMenu`, `Popover`,
  `Select`) or name the canonical cell so it sorts first.
- **Radix overlays**: `defaultOpen` alone centres the panel over its own trigger
  and hides it. Use `position="popper" align="start"` (or `align`/`sideOffset`
  on the content) so trigger and panel are both visible.
- **The date pickers cannot be opened from props.**
  `src/components/date-picker.tsx` owns its popover state and exposes no
  `open`/`defaultOpen`, so there is no static equivalent of clicking the trigger.
  Their cards show trigger states; the open panel is covered by the `Calendar`
  card (`DatePicker`'s popover content is literally `<Calendar mode="single">`).
  Making the panel previewable would be an app change, not a config one.

- **Cell ordering matters for `cardMode:"column"` too**, not just `"single"`:
  the alphabetically-first export is what sits above the product card's ~500px
  fold. Name the canonical cell so it sorts first (cheaper than a `primaryStory`
  entry per component).
- **The per-component `<Name>.d.ts` can drop nullability.**
  `MotwMatchBanner.d.ts` says `youtubeUrl: string` where the source is
  `string | null` (and `null` is the common case). The generated root
  `index.d.ts` is the more faithful contract when they disagree.
- **Don't port the gallery's `PROFILE_ROWS` dates** — they produce overlapping,
  non-weekly Spieltage. Drive schedule rows off `MATCHDAYS` in `_fixtures.ts`.
- **Fixtures worth promoting on a future pass** (built more than once, still
  local to their previews): a shared `PROFILE_ROWS` builder, and the five
  `StoredResult` fixtures inside `ReportSummary.tsx`.

- **`flex-1` page-body components render EMPTY in an auto-height flex parent.**
  `SeedingSheet` and `PostSeasonPanel` are page bodies: `flex-basis:0%` plus
  `min-h-0` collapses them to zero height. They need a definite-height wrapper —
  `h-screen` is the only compiled option that fills a 900px card, since the named
  scale stops at `h-96`.
- **Headings carry no font-size in this system.** Preflight resets it and the
  `h1`–`h3` rule only sets family/case/weight/tracking, so a bare `<h1>` renders
  at body size and reads as broken. Every app page states its own step of the
  scale explicitly (`text-7xl`, `text-2xl`, …) — previews must too.
- **`ControlPill` is `flex shrink-0`**: as a lone block child it stretches full
  width and stops reading as a pill. Give it a flex parent.
- **Never port the gallery's `seedPlayer()`** — it uses `crypto.randomUUID()`, so
  ids change every run and the render hash never stabilizes. Use stable ids.
- **Gallery bug: `POST_SEASON_OVERBOOKED` (`gallery.tsx:371`) does not do what
  its comment claims.** It is documented as exercising the overbooked diagonal
  stripe, but `previewZones()` only stripes a place claimed by BOTH a top-side and
  a bottom-side band, and that fixture has zero promotions and zero
  promotion-playoff slots — so it only trips the capacity note ("Überbelegt um
  1"). The `PostSeasonPanel` preview instead uses `championshipPlayoffSlots: 2` +
  `guaranteedDemotions: 2` + `demotionPlayoffSlots: 1` on `groupSizes: [4,4]`,
  which produces the real stripe and keeps the "✕ Nicht gedeckt" seam. Worth
  fixing in the gallery.
- **`SeedingSheet` cannot fit its full grid in a card.** Its grid has ~1364px of
  fixed column minimums; the override is `1440x900`. Below that the Division and
  Gruppe select columns fall outside the screenshot (the component scrolls, so
  nothing is broken). Deliberately NOT worked around with a `scale()`/`zoom`
  wrapper — cards get imitated, and that would teach a ~79% type scale.
- **More fixtures worth promoting on a future pass**: `zonesFor`, three
  `MatchResultLite` states, the 14-player stable-id seeding roster, and an
  18-name `FULL_FIELD` (the shared `ROSTER`'s four names are too few for
  `PlayerGrid`'s grid to wrap).

### Type icons: in the sprite bucket since 2026-10-18

`TypeIcon` used to load `/type-icons/*.svg` from the app's `public/`, which no
design-system card or design can reach. The icons (with their MIT LICENSE) now
live in the sprite bucket at `/types/` (`SPRITE_BASE` in
`src/features/teamsheets/sprite-base.ts`, kept dex-free on purpose so the stats
components don't pull `sprites.ts` and with it `@pkmn/dex`). Remote images from
`storage.googleapis.com/justhit-sprites` load in cards and designs.

### Known gap: the logo is not in the bundle

`MotwBlock` and `PublicLeague` render a faint rotated logo watermark — one of the
brand's four signature elements (DESIGN.md §4). The components reference
`/logo.svg`, which lives in the app's `public/`, and the converter has no config
key for arbitrary root assets (`guidelinesGlob` takes markdown only, and the
upload plan's write globs don't include a root `logo.svg`). Every preview of
those two therefore renders **without** the watermark — clean, not broken, and at
5–6% opacity it is a subtle loss. To fix it properly, the logo needs to ship as a
bundle asset and the plan's writes need to allow it.

### Where the gallery does NOT help

`gallery.tsx` has no specimen for any of the nine form primitives (Input, Label,
Textarea, Checkbox, RadioGroup, Switch, Select, Slider, TypeToConfirm), nor for
`Calendar`, `DatePicker`, `TimePicker`, `SpoilerPill`. Those previews were
sourced from real feature code instead — `registration-form.tsx`,
`settings-form.tsx`, `report-form.tsx`, `dispute-dialog.tsx`, `drops-section.tsx`,
`finalize-dialog.tsx`, `sheet-rows.tsx`, and the real option lists in
`regions.ts` / `registration.ts`.

## Findings for the app team (not design-sync problems)

Found 2026-10-18 (all five fixed the same day: af0cd08 for the first four,
the bracket in the commit after it):

- `motw-player.tsx`: long names without spaces overflowed their column
  (now `wrap-anywhere hyphens-auto`).
- `usage-cards.tsx`: a five-digit value pushed its unit past the card edge.
- `step-bar.tsx`: "Finalisieren…" opened a dialog with a trailing "…".
- Match page: a drop-decided match without a result showed the drop banner
  above "noch nicht gemeldet" (now `PublicMatchView` state `dropped`).
- `relegation-playoffs-public.tsx`: the bracket grid was `min-w-max`, so a
  three-round bracket scrolled at every desktop width; the columns now shrink
  within their `minmax(240px, 340px)` and only scroll below that.
- `_fixtures.ts` `PUBLIC_OVERVIEW` tags the viewer "1b" while they play in 1a,
  lacks group 1b, and gives them a bye in their MotW week; PublicLeague and
  InSeasonDashboard correct this locally (other cards are graded against it).

Found 2026-07-27:

Surfaced while authoring previews against the real components:

- **`Switch` sizing override in `settings-form.tsx` is broken.** It resizes the
  switch with `h-[22px] w-[40px] … translate-x-[18px]!`, but that loses to the
  component's own `data-[size=default]:w-[32px]` (a data-attribute variant beats
  a plain utility, and the `!` only covers the thumb rules). The result is an
  18px knob translated 18px inside a 32px track — the thumb renders half outside
  the pill. The real fix is `size` support on `Switch`, not a className
  override. The preview deliberately uses the unmodified component.
- **`Slider` renders two thumbs when `defaultValue` is omitted** — it falls back
  to `[min, max]`. That, not styling, is why its floor card looked broken.
- **`Checkbox` has no indeterminate glyph**: `checked="indeterminate"` renders a
  plain tick on an unfilled box.
- **Radix `Select`'s default `position="item-aligned"`** centres the open panel
  over its own trigger, hiding it. The `Select` preview uses
  `position="popper" align="start"`. (`DropdownMenu` and `Popover` are
  popper-positioned already — this is Select-only.)
- **`ActionLink` accepts `disabled` but has no disabled styling**, so a disabled
  cell would be visually identical to the enabled one. The preview deliberately
  ships no disabled cell.
- **`profile-schedule.tsx`'s `w-[92px]` date column wraps German week ranges**
  (`12. Jan. – 18. Jan.`), giving the schedule ragged row heights.
- **`report-summary.tsx` offers "Replays spoilerfrei ansehen" whenever a result
  is covered**, including cartridge results that have no replays. The previews
  keep covered cells on Showdown so the cards don't showcase it.
- **`DivisionSeparator` isn't pluralized** — "→ **1 Gruppen** bei Größe 8" is
  reachable.

## Authoring learnings from the 2026-10-18 sync

- **Router context.** Components that call `useRouter`/`usePathname`/
  `useSearchParams` throw outside Next. `.design-sync/next-router.tsx`
  (`NextAppRouter`, shipped via `cfg.extraEntries`, wrapped around every preview
  via `cfg.provider`) provides Next's own three contexts with a no-op router.
  Nest one with `pathname`/`search` for a specific page. It must keep up with
  Next's `AppRouterInstance` type (Next 16 added `bfcacheId`). `prepare-css.mjs`
  re-exports repo-owned extraEntries from `index.d.ts` so previews type-check.
- **Heading font = its own family.** The app loads the heading instance at
  700/800 only (`layout.tsx`, since a14cc46 a local variable font with
  `weight: "700 800"`), so `font-heading` text without a bold class renders bold
  there. The bundle mirrors that with a separate "Montserrat Heading" family
  (700/800 faces only) in `fonts.css`/`ds.css` and in the artifact's
  `tokens.json`. With one shared family those titles rendered thin.
- **Hover-only tooltips** (`HoverHint`, `InfoLabel`) are shown open by focusing
  the trigger on mount; the wrapper needs a fixed height AND `items-start`.
  `FavoriteSearch` opens its list on focus the same way.
- **The capture screenshots the viewport only** (900x700 by default): page-body
  components need a taller `viewport` override or they grade as cut off.
- **A recapture deletes the component's grade**, and any source edit (a comment)
  triggers one. Write grades after the final capture. Never run biome over the
  whole `previews/` folder while agents work: it reformats their files and
  clears their grades.
- **Pure helpers may be value-imported in previews** when they don't reach the
  db (`finalTable`, `relegationPlayoffsPreview`, `resolveRelegationPlayoffs`,
  `publicCards`, `@/features/regelwerk/components/prose`). Check a helper's
  output quickly with `node --import ./scripts/src-alias.register.mjs <file.ts>`.
- Copy rules apply to previews too (constitution 1.1.0): straight quotes even in
  comments, no em-dash in rendered copy.
- `[GRID_OVERFLOW]` on page-sized cards: `cardMode: "column"`; a portal tooltip
  (`HoverHint`): `cardMode: "single"` + `primaryStory`.

## Known render warns

Triaged as legitimate; a warn NOT in this list on a later sync is new:

- `[RENDER_BLANK]` / `[RENDER_THIN]` on unauthored components is the floor card
  doing its job, not a failure. It disappears as previews get authored.

## The repo's CI lints these files — keep them clean

`.github/workflows/ci.yml` runs **`npx biome ci .`** over the whole repo, and
`biome.json` only excludes `node_modules`, `.next`, `dist`, `build`, `design` and
`supabase/migrations` (plus everything gitignored, via `useIgnoreFile`). So every
committed file under `.design-sync/` is linted AND format-checked, and
`biome ci` is stricter than `biome check`: no auto-fix, and formatting
differences are errors. The first import broke `main`'s pipeline this way — CI
failed at the biome step, and because `deploy` is gated on `needs: checks`,
nothing deployed.

Before committing sync inputs:

```sh
npx biome check --write .design-sync/   # fixes formatting + import order
npx biome ci .                          # must exit 0
```

**Generated committed files must be emitted biome-clean.** `fonts.css` is
written by `prepare-css.mjs`; formatting the file by hand would be undone on the
next run and break CI again. The generator therefore emits biome's quote style
(double quotes) directly — verified idle-stable, so two consecutive runs produce
an identical, biome-clean file. If you add another generated+committed file,
either match biome's output or exclude it in `biome.json`. Do not "fix" a
generated file in place.

Four pre-existing warnings in `src/` (one unused import in an integration test,
three ineffective `biome-ignore` comments) do not fail `biome ci`.

## Re-sync risks

- **Tailwind coverage depends on the safelist — keep it in step with the
  conventions header.** `ds.css` is compiled from `.design-sync/ds-entry.css`,
  which wraps `globals.css` and declares an explicit `@source inline(...)`
  safelist plus `@source` roots for `../src` and `./previews`. Without it the
  sheet carried only the classes buli-hub itself uses, so `p-6` / `grid-cols-3`
  resolved to nothing and any new layout collapsed silently. Two standing rules:
  (a) `conventions.md` promises a specific vocabulary — if you widen or narrow the
  safelist, update that file too, and (b) **arbitrary values can never be
  safelisted** (`w-[620px]`, `gap-[13px]`), so they exist only if the app uses
  them. `node .design-sync/check-classes.mjs` is the check.
- **Verify `conventions.md` against the fresh build on every re-sync.** It names
  concrete tokens, classes and components, and the design agent trusts it — a
  name that stops resolving produces silently unstyled output. Every claim in it
  was verified against the built artifacts at first sync; re-verify, don't assume.
- **Fonts are network-fetched once.** `.design-sync/fonts/*.woff2` are committed
  precisely so re-syncs work offline. If they are ever deleted, `prepare-css.mjs`
  re-downloads from Google Fonts and needs network.
- **The scope map is hand-materialized.** `cfg.componentSrcMap` was seeded from
  the `dev/ui` gallery's imports, then filtered by the server-action taint scan.
  It does **not** auto-follow the gallery — a component added to the gallery later
  will not appear until the map is updated. Re-run the taint check before adding
  any feature component (a new server-action import breaks the whole build, loudly).
- **`exported PascalCase symbols: 0`** in the build log is expected here, not a
  fault: there is no shipped `.d.ts` tree to scan, so discovery comes entirely
  from `componentSrcMap`. `.d.ts` prop bodies are still extracted per component
  from the `.tsx` sources via ts-morph.
- **Toolchain assumed:** node 24.17, Tailwind CLI 4.3.2 pinned in `.ds-sync`
  (matches the repo's `tailwindcss` devDep — keep them in step), playwright 1.61.0.
  On 2026-10-18 the WSL2 cache held `chromium-1234` (no 1228): the 1.61.0 client
  drives it fine with `DS_CHROMIUM_PATH=~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`
  plus the `pw-deps` `LD_LIBRARY_PATH`.
- **to-system.mjs assumes the artifact type's file layout** (Design System type,
  contract 0.2.47 at migration). If the type's `format.md` changes, re-check the
  mapping before publishing.
- **The 6 MB bundle cap.** A component that starts importing `@pkmn/dex`,
  `@pkmn/mods` or another data package can push the bundle past it; check the
  `_ds_bundle.js` size after every build.
- **Tokens drift silently.** `globals.css` tokens are mirrored into the
  artifact's `tokens.json` by hand (step 4 above): diff `globals.css` on every
  sync.
- **README header lives in the artifact now.** to-system.mjs keeps the
  published header; `conventions.md` is a copy kept for the converter's README
  and should be updated alongside.
- **The app's fonts are local since a14cc46** (`src/app/fonts/montserrat.woff2`,
  one variable file for both instances). `prepare-css.mjs` still self-hosts the
  static Google per-weight files from `.design-sync/fonts/`; same design, so the
  cards are right, but pointing it at the app's own file would remove the
  duplicate source.
