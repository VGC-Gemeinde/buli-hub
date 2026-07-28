# design-sync notes — buli-hub → claude.ai/design

Project: **VGC Gemeinde Design System** (`10803020-3e43-41f1-80f1-029698d498ad`)
First sync: 2026-07-27. Shape: `package` (no Storybook anywhere in the repo).

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

## Scope: 49 of 65 candidates

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
  „heute" — it reads as broken rather than stale. Pass both anchors explicitly.
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
  promotion-playoff slots — so it only trips the capacity note („Überbelegt um
  1"). The `PostSeasonPanel` preview instead uses `championshipPlayoffSlots: 2` +
  `guaranteedDemotions: 2` + `demotionPlayoffSlots: 1` on `groupSizes: [4,4]`,
  which produces the real stripe and keeps the „✕ Nicht gedeckt" seam. Worth
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
- **`report-summary.tsx` offers „Replays spoilerfrei ansehen" whenever a result
  is covered**, including cartridge results that have no replays. The previews
  keep covered cells on Showdown so the cards don't showcase it.
- **`DivisionSeparator` isn't pluralized** — „→ **1 Gruppen** bei Größe 8" is
  reachable.

## Known render warns

Triaged as legitimate; a warn NOT in this list on a later sync is new:

- `[RENDER_BLANK]` / `[RENDER_THIN]` on unauthored components is the floor card
  doing its job, not a failure. It disappears as previews get authored.

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
