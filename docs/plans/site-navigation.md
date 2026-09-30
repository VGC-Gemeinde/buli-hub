# Site navigation: one header everywhere

**Status: done** (2026-09-30): verified by screenshots of every section at
1440, 1100 and 390px, light and dark.

Built from the designer hand-off `design/NAVIGATION.md` (option 2a of
`design/Navigationskonzept.dc.html`), which specifies the look; this plan holds
the model and the page mapping.

## Context

The top-level nav (Liga, Spieler-Dashboard, Staff-Bereich) has to stay put:
entries that vanish from the top of the page make it harder, not easier, to
know where one is and how to get elsewhere. So there is no breadcrumb mode
that replaces the nav on detail pages, and a section's own pages do not
replace it either; they get a row under it that belongs to the header, left
where the nav is, instead of a separate bar centred under a left-aligned
header.

## The model

1. **The header never changes.** On every page the same top-level entries,
   in the same place: Liga (while a season runs), Spieler-Dashboard,
   Staff-Bereich (staff). No breadcrumb mode, nothing collapses.
2. **Every page belongs to one section**, and that section's entry is a tab
   (`bg-muted`, rounded top corners, orange tick) that runs straight into the
   section row below. Pages without a section (Regelwerk, Profil, legal
   pages) mark none; on Profil and Regelwerk the user menu shows "you are
   here" instead (orange ring on the avatar, the item marked).
3. **Every section has a row**: a full-width `bg-muted` line under the main
   bar, its first label on the 28px edge the logo starts on, the current page
   marked with the orange bar. Liga: Übersicht, Spielplan. Spieler-Dashboard:
   Übersicht, plus Anmeldung while it has something to show. Staff-Bereich:
   the staff tabs, grouped Woche / Saison / Hub. A row with one entry is kept
   on purpose: the header's height never changes inside a section.
4. **Detail pages stay neutral in the row.** A match, a player's profile or
   a teamsheet marks its section's tab and no row entry: the row lists only
   real destinations, and a page one lands on from a table is none of them.
   The page carries its own way back, **← Zurück** above the title: to the
   previous page in the hub, or, opened from outside, to its section.
5. **Nothing moves inside a section.** Fixed tier heights, every label
   reserves its bold width, and `html` keeps
   `scrollbar-gutter: stable`.

## Pages and sections

| Page | Section | Row entry |
|---|---|---|
| `/` (Liga-Übersicht) | Liga | Übersicht |
| `/spielplan` | Liga | Spielplan |
| `/spieler/[userId]` (profile) | Liga | none |
| `/pastes/[id]` | Liga | none |
| `/match/[matchId]` | by viewer: participant → Spieler-Dashboard, staff (not playing) → Staff-Bereich, anyone else → Liga | none |
| `/spieler` | Spieler-Dashboard | Übersicht |
| `/anmeldung` | Spieler-Dashboard | Anmeldung |
| `/staff`, `/staff/*` | Staff-Bereich | the page's tab |
| `/profil`, `/regelwerk`, legal pages | none | |

The match page belongs to where the viewer comes from.

## Implementation

- `SiteHeader` takes `section?: Section`. The main
  bar is a grid (logo | `HeaderNav` | theme toggle and user menu) with the
  28px gutter; the `SectionNav` row is a full-width sibling below it. The
  header only draws its own bottom border when there is no row.
- `HeaderNav` marks the page's section as the tab; below `sm` the labels take
  their short forms (Liga, Spieler, Staff) so the bar stays one line.
- `SectionNav` (client) marks the current page via `activeHref` (nothing on
  a detail page). On a phone it scrolls sideways, fades at the right edge
  while more is hidden, and opens scrolled to the current entry.
- `BackLink` (`src/components/back-link.tsx`) on every detail page:
  `router.back()` when the tab has navigated inside the hub
  (`NavigationMemory` in the root layout notes that), otherwise a plain link
  to the page's section.
- The pure part (`src/features/navigation/sections.ts`): `sectionRow(section,
  { phase, role, registrationRelevant })`, `activeHref`, `matchPageSection`.
  The header reads whether the registration is relevant (open, or the viewer
  registered) only on Spieler-Dashboard pages.
- The user menu lists Profil, Regelwerk, Feedback geben, Abmelden, and below
  `sm` the "Dunkles Design" switch that replaces the header's theme toggle
  there. It lists no section: the header never hides one.

## Tests

- Unit: `sectionRow` per section, phase and role; the page-to-section rule
  of the match page as a pure function (`matchPageSection`).
- Screenshots at 1440, 1100 and 390px, light and dark: Liga-Übersicht,
  Spielplan, a match page as participant and as staff, a player profile, the
  staff overview and Woche, the seeding workspace, the Spieler-Dashboard, the
  Profil with the menu open.
