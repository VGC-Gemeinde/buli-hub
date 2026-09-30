# Buli Hub — Site navigation (design handoff)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still valid).
Replaces the previous `NAVIGATION.md`. `docs/plans/site-navigation.md` still
holds the reasoning for "the header never changes"; this pass keeps that model
and fixes how it looks. Reference design: project file
"Navigationskonzept.dc.html", **option 2a**. 1a/1b/1c are earlier variants, the
bottom section rebuilds today's header for comparison.

Domain logic stays as it is (`staffNav`, `matchPageSection`, `activeHref`,
phase gating). The views change, plus one new `sectionRow` case (§4).

---

## 1. The rule

1. **One header, two tiers, one edge.** The main bar (Liga, Spieler-Dashboard,
   Staff-Bereich) is identical on every page. Every section has a section row
   directly under it. Both tiers start at the logo's left edge, the 28px page
   gutter, which is also where the Divisionen workspace starts.
2. **The active main entry is a tab.** A `bg-muted` tab with rounded top corners
   sits behind the active entry and runs straight into the `bg-muted` section
   row below. That link, not position, says whose pages the row lists.
3. **Orange means "you are here", once per tier.** Main bar: the orange tick in
   the tab. Section row: the 3px orange bar under the current entry. Ticks
   appear only in the main bar, never in the row.
4. **Detail pages stay neutral in the row.** A match, a player profile or a
   teamsheet marks its section's tab; no row entry is current, because the
   row lists only real destinations and a detail page is none of them. The
   page carries its own way back: **← Zurück** above the title (§3.5).
5. **Nothing moves inside a section.** Tier heights are fixed, every label
   reserves its bold width, and `scrollbar-gutter: stable` stays on `html`.

## 2. What changes against today

| | Today | 2a |
|---|---|---|
| Gutter | `px-5` (20px) | `px-7` (28px), same as the seeding workspace |
| Main bar | one `py-2.5` row, ~56px | 64px: `pt-3` + 52px row |
| Active main entry | orange tick + bold | the same, plus a `bg-muted` tab |
| Section row | in the nav column, starts ≈159px (under "Liga") | own full-width row, first label at 28px |
| Row background | white | `bg-muted`, continues the tab |
| Row tabs | `px-2.5` | `px-3` |
| Spieler-Dashboard | no row | row: Übersicht (+ Anmeldung) |
| Detail pages | breadcrumb or row with nothing marked | row with nothing marked, **← Zurück** on the page |
| Staff-Bereich in user menu | yes | removed |
| Theme toggle on phones | in the bar | in the user menu |

## 3. Desktop (reference widths 1440 and 1280)

### 3.1 Anatomy

```
3px    accent line       h-[3px] bg-brand-orange                        (unchanged)
64px   main bar          pt-3 + h-13 row: logo | nav | controls
45px   section row       h-11 bg-muted + border-b
```

- Header total: **112px** on section pages. On pages without a section
  (Profil, Regelwerk, Impressum, Datenschutz): **68px**, the main bar gets
  `border-b` because there is no row under it.
- Main bar: `grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-9 bg-background px-7 pt-3`.
  Each of the three children is `h-13` (52px) and centres its content
  vertically, so logo, entries and controls share one line and the tab fills
  the 52px exactly.
- Section row: a sibling **below** the grid (not inside it), full header
  width, `px-4`.

### 3.2 Main bar

- **Logo:** unchanged. `41×28 rounded-md`, wordmark `text-[17px] font-semibold
  tracking-tight`, `hidden sm:inline`.
- **Nav:** `<nav aria-label="Hauptnavigation" className="flex h-13 items-stretch">`.
  No gap between entries. Each entry
  `relative flex items-center gap-2 whitespace-nowrap px-[18px] text-sm`.
- **Controls:** `ThemeToggle` + `UserMenu` trigger, `flex items-center gap-1`,
  unchanged apart from §7.

| State | Treatment |
|---|---|
| Inactive | `font-medium text-muted-foreground`, `<Tick size="s" color="neutral" />` |
| Hover | `text-brand-blue dark:text-white`. No background, tick unchanged. |
| Active (the page's section) | tab behind the content: `<span aria-hidden className="absolute inset-0 rounded-t-md bg-muted" />`. Content in a `relative` wrapper: `<Tick size="s" />` (orange) + label `font-semibold text-brand-blue dark:text-white`. `aria-current="true"` (the *page* is marked in the row). |
| Focus | stock `focus-visible` ring (orange), inset, so it doesn't collide with the row: `focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring` |
| No section | no tab, all entries inactive |

The tab is straight: **no skew**, `rounded-t-md` (8px) on top, square at the
bottom so it runs seamlessly into the row. The tab and the row are the same
token (`bg-muted`), with no border between them.

Every label reserves its bold width with the grid trick `SectionNav` already
uses, so the tab can move without shifting the neighbours:

```tsx
<span className="grid">
  <span className="col-start-1 row-start-1">{label}</span>
  <span aria-hidden className="invisible col-start-1 row-start-1 font-semibold">
    {label}
  </span>
</span>
```

Active entry, complete:

```tsx
<Link
  href={entry.href}
  aria-current="true"
  className="relative flex items-center whitespace-nowrap px-[18px] text-sm font-semibold text-brand-blue dark:text-white"
>
  <span aria-hidden className="absolute inset-0 rounded-t-md bg-muted" />
  <span className="relative flex items-center gap-2">
    <Tick size="s" />
    <Label text={entry.label} />
  </span>
</Link>
```

### 3.3 Section row (`SectionNav`)

`<nav aria-label="Bereich" className="flex h-11 items-stretch border-b bg-muted px-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">`

`px-4` on the row plus `px-3` on each tab puts the first label at exactly
28px, under the logo's left edge.

| Element | Spec |
|---|---|
| Tab | `relative flex shrink-0 items-center whitespace-nowrap px-3 text-[13.5px]`, bold width reserved (as today) |
| Inactive | `font-medium text-muted-foreground` |
| Hover | `text-brand-blue dark:text-white` |
| Current | `font-semibold text-brand-blue dark:text-white` + bar `absolute inset-x-3 -bottom-px h-[3px] rounded-t-[2px] bg-brand-orange` (sits on the border) |
| Group divider | `mx-2 h-4 w-px shrink-0 self-center bg-border` |

On a detail page no tab is current and the row shows no bar: the main bar's
tab says which section the page belongs to, the page's title says what it
is.

Width check: the full staff row (9 entries, 3 dividers) ends 948px from the
window edge. That fits at 1440, 1280 and 1100.
Below about 1070px the row scrolls sideways (§5). It never wraps.

### 3.4 Content under the header

Unchanged: the centred columns (640 / 760 / 1040, `DESIGN.md` §8.5). The header
is the frame of the window, full width and left-aligned. The column belongs to
the page. This holds up now because both header tiers share one edge. Attempt 2
failed because a centred bar sat under a left-aligned header, giving two
edges inside the chrome itself.

### 3.5 Back link on detail pages (`BackLink`, `src/components/back-link.tsx`)

Match, player profile and teamsheet start their content with **← Zurück**
above the title: `mb-4.5 inline-block text-[13px] font-medium
text-muted-foreground`, hover `text-brand-blue dark:text-white`. It goes to
the previous page in the hub (a profile opened from the Spielplan goes back
to the Spielplan); opened from outside (a Discord link, a bookmark), it leads
to the page's section: the match page by viewer (dashboard, Staff-Bereich or
Liga-Übersicht), profile and teamsheet to the Liga-Übersicht. The in-app
history is noted by `NavigationMemory` in the root layout.

## 4. Sections and rows

Every section has a row. The header height is then the same on every page of
a section.

| Section | Row | Pages → current entry |
|---|---|---|
| Liga | Übersicht, Spielplan | `/` → Übersicht · `/spielplan` → Spielplan · `/spieler/[id]`, `/pastes/[id]`, `/match/[id]` (neutral viewer) → none |
| Spieler-Dashboard | Übersicht (+ Anmeldung) | `/spieler` → Übersicht · `/anmeldung` → Anmeldung · `/match/[id]` (participant) → none |
| Staff-Bereich | groups from `staffNav` (unchanged) | `/staff/*` → its tab · `/staff/seeding` → Divisionen · `/match/[id]` (staff, not playing) → none |
| none | none | `/profil`, `/regelwerk`, `/impressum`, `/datenschutz` |

- **New:** `sectionRow("spieler", …)` returns one group with **Übersicht**
  (`/spieler`) and, while `/anmeldung` has something to show (registration open,
  or the player is registered), **Anmeldung** (`/anmeldung`). A one-entry row is
  kept on purpose: it keeps the header's height constant inside the section.
- The Liga row keeps its current condition (only while the season runs; the
  Liga entry itself only exists then).
- `matchPageSection` unchanged. `activeHref` unchanged. On a detail page it
  returns `null`, so no row entry is marked.

## 5. Mobile (390px)

| Part | Spec |
|---|---|
| Main bar | 56px: `pt-2` + `h-12` row, `px-4`, `gap-x-3.5`. Logo (no wordmark) · nav · avatar |
| Main labels | short forms below `sm`: **Liga · Spieler · Staff** (render both, `sm:hidden` / `hidden sm:inline`). Entries `px-[11px]`, `gap-[7px]` between tick and label. Tab and states as desktop. Worst case (staff, season running): 243px of 253px available. One line, it never stacks. |
| Theme toggle | `hidden sm:flex` in the bar. Below `sm` it lives in the user menu (§7). |
| Avatar trigger | without the chevron below `sm` |
| Section row | `h-11 px-1` (+ `px-3` tabs = 16px gutter), `bg-muted`, dividers `mx-1.5`, scrolls sideways, scrollbar hidden. While it overflows, fade the right edge: `[mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]` |
| Current entry in view | on mount, set `nav.scrollLeft` so the current tab is fully visible with 16px to spare. Set `scrollLeft` directly, not `scrollIntoView` (that can scroll the page). |
| Height | 104px on section pages, 60px without |

Main entries, row tabs and menu items are all at least 44px high.

## 6. Divisionen (full-screen workspace)

- The header is exactly the staff header: same tiers, "Divisionen" current.
  No back link, no chrome of its own.
- The workspace docks directly under the row's bottom border. Its title row and
  rows already use `px-7` (sheet rows `pl-5`…`pl-13`). With the new 28px gutter,
  the **logo, the first row tab and "Divisionen einteilen" share one edge**.
  That shared edge is what fixes the indented look.
- Layout unchanged: page `flex h-screen flex-col overflow-hidden`, header
  `shrink-0`, workspace frame `flex min-h-0 flex-1 overflow-x-auto` with the
  `min-w-[1520px]` inner. The header always has the window's width and never
  scrolls sideways. Only the workspace scrolls, inside its frame.

## 7. User menu (`user-menu.tsx`)

The personal tier: things about *me*, not sections. It is part of the concept.

- Items: label **Angemeldet als {name}** · separator · **Profil** ·
  **Regelwerk** · **Feedback geben** · **Abmelden**.
- **Remove the Staff-Bereich item** (and its decorative tick). The header
  always shows the entry. The Spieler-Dashboard left the menu earlier for the
  same reason.
- **Current page:** on `/profil` and `/regelwerk` (no section, so nothing in
  the header is marked):
  - trigger: avatar gets `ring-2 ring-brand-orange`
  - open menu: the item is `bg-accent font-semibold text-brand-blue dark:text-white`
    with `<Tick size="s" />` right-aligned (`flex items-center justify-between`)
  - read the path with `usePathname()`
- **Below `sm`:** a **Dunkles Design** row with `<Switch>` between Feedback
  geben and Abmelden, separated by `DropdownMenuSeparator`. It replaces the
  toggle in the bar and uses the same `useTheme` logic as `ThemeToggle`. Items
  `h-11` instead of `py-1.5`, content `w-[220px]`.
- Trigger otherwise unchanged (`hover:bg-secondary`, chevron from `sm`).
- Signed out: the same main bar without nav, `SignInButton variant="outline"`
  on the right (unchanged).

## 8. Dark mode

No per-element dark styling beyond the listed `dark:text-white`. The tab and
the row are `bg-muted` (8% white on dark navy), which separates the tiers more
quietly than in light mode. That is expected. The orange tick and bar carry
the state.

## 9. Checklist

1. `site-header.tsx`
   - wrapper: accent line, then `<header>` with the grid (§3.1): `px-4 pt-2
     gap-x-3.5 sm:px-7 sm:pt-3 sm:gap-x-9`, children `h-12 sm:h-13`
   - `SectionNav` moves below the grid as its own full-width row. Drop
     `col-span-3 sm:col-span-1 sm:col-start-2`.
   - `border-b` on the header only when there is no row
   - `ThemeToggle` `hidden sm:flex`
2. `header-nav.tsx`: `flex h-full items-stretch`, entries per §3.2 (tab span,
   reserved bold width, short labels below `sm`, `aria-current="true"`),
   `aria-label="Hauptnavigation"`. Drop `flex-wrap`.
3. `section-nav.tsx`: remove `-ml-2.5`. `h-11 bg-muted border-b px-1 sm:px-4`,
   tabs `px-3`, bar on the bottom edge, mobile fade while overflowing,
   initial `scrollLeft`.
4. `sections.ts`: `sectionRow("spieler", …)` per §4. Extend `sections.test.ts`
   (spieler row with and without Anmeldung).
5. Detail pages (`/match/[matchId]`, `/spieler/[userId]`, `/pastes/[id]`)
   start their content with `BackLink` (§3.5).
6. `user-menu.tsx` per §7.
7. Seeding page: no change beyond the header. Its `px-7` is now the gutter.
8. Update `docs/plans/site-navigation.md` (rows for every section, detail
   pages, user menu) and `STAFF-DASHBOARD.md` §1 / `STAFF-BEREICH.md` §1
   (the user-menu entry is gone).
9. Verify light and dark at 1440, 1280, 1100 and 390: Liga-Übersicht,
   Spielplan, a match as neutral viewer / participant / staff, a player profile,
   a staff page, Divisionen, Profil (menu open). Switch between staff tabs and
   check nothing shifts. Then `npx biome check --write .`, `npx tsc --noEmit`,
   `npm test -- --run`.
