# Buli Hub — Design System (source of truth)

AI implementation context. This document plus the two sibling files is everything needed to implement the base design:

- `globals.css` — drop-in replacement for `src/app/globals.css` (all shadcn tokens, light + dark)
- `logo.svg` — the colored logo badge → copy to `public/logo.svg`

The reference design lives in the design project ("Landing Page.dc.html", option 4a). Match it visually; exact values below.

---

## 1. Brand palette

| Token | Value | Usage |
|---|---|---|
| falinks-blue | `#021f66` | Structural brand color. Headings, logo background, text on orange buttons |
| pawmo-orange | `#ff7b00` | Primary. CTA buttons (both modes), accent lines, ticks, focus ring |
| wooloo-white | `#ffffff` | Light-mode background, text on blue |

Derived neutrals are all **navy-tinted** (oklch hue 260–265, low chroma) — never pure gray. Dark mode background is a dark navy derived from falinks-blue: `oklch(0.17 0.045 265)`, not black.

**Mode behavior:** both modes supported, system default (`.dark` class strategy, already wired in globals.css).

**Primary is pawmo-orange in BOTH modes** (decided after comparison): `--primary: #ff7b00`, `--primary-foreground: #ffffff` (wooloo-white). Falinks-blue is the structural color — headings, logo, dark-mode background tint — not the button color.

Everything else uses the standard shadcn token names — components never hardcode colors; they use `bg-primary`, `text-muted-foreground`, `border-border`, etc. The only raw brand utilities are `bg-brand-blue` / `bg-brand-orange` (defined in globals.css) for decorative accents.

## 2. Typography

One font, both roles, loaded via `next/font` (replaces Geist): **Montserrat**, matching the official VGC Gemeinde style guide (Montserrat Bold for headline use). Previously Barlow + Barlow Condensed — switched to align with the brand style guide; buli-hub has no use for the guide's display face (Fastup), so headings stay in Montserrat rather than adopting it.

- **Montserrat** — headings (`--font-heading`). Weights 700/800. Always `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: 0.02em`. Applied globally to `h1–h3` in globals.css.
- **Montserrat** — body (`--font-sans`). Weights 400/500/600.

Keep `--font-geist-mono` handling as-is or drop mono until needed.

### layout.tsx font setup

```tsx
import { Montserrat } from "next/font/google";

const montserratSans = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const montserratHeading = Montserrat({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-heading",
});

// on <html>:  className={`${montserratSans.variable} ${montserratHeading.variable}`}
```

### Type scale (landing page)

| Element | Spec |
|---|---|
| Hero h1 | heading font, 68px (`text-[68px]` or `text-7xl`), line-height 1.05, color `text-brand-blue dark:text-white` |
| Credit line | body font, 13px, weight 600, uppercase, `tracking-[0.16em]`, `text-muted-foreground` |
| Header wordmark | body font, 17px, weight 600 |
| Buttons | body font, 14–15px, weight 500–600 |

## 3. Logo

`public/logo.svg` — self-contained badge (white Falinks mark on falinks-blue rounded rect). Works on any background, light or dark.

- Header: height 30px, `rounded-md`
- Hero: width 148px, `rounded-2xl`, shadow `0 8px 28px oklch(0.2 0.06 264 / 0.25)`
- Watermark (decorative): 560px wide, `opacity-5` (6% in dark), `rotate(-10deg)`, overflowing bottom-right corner, `pointer-events-none`, behind content

## 4. Signature visual elements (the "sporty" kit)

Reuse these across future pages — they are the brand identity beyond colors:

1. **Top accent line** — 3px solid pawmo-orange strip at the very top of the viewport, full width. On every page.
2. **Skewed orange ticks** — small orange rectangles with `skewX(-18deg)`,
   flanking uppercase labels. Use the shared `<Tick>` component
   (`src/components/tick.tsx`) with one of the three **sanctioned sizes** (§8.1);
   do not hand-roll ad-hoc sizes. On the landing page they flank the Gemeinde
   credit line (§5); reuse for section labels across pages.
3. **Logo watermark** — faint oversized rotated badge in a corner (spec in §3).
4. **Uppercase condensed headings** — every h1–h3.

Do NOT add: gradients, rounded-corner cards with left-border accents, emoji.

## 5. Landing page spec (current scope: signed-out)

Layout: full-height column. Orange accent line → header → centered hero.

### Header
- `flex items-center justify-between border-b px-7 py-3`
- Left: logo (h-30px, rounded-md) + "Buli Hub" wordmark, `gap-3`
- Right, signed out: `<Button variant="outline">Mit Discord anmelden</Button>` (h-9)
- Right, signed in: existing `<UserMenu />` (unchanged)

### Hero (`main`, flex-1, centered column, text-center)
Order, top to bottom:
1. Logo badge, 148px, rounded-2xl, shadow — margin-bottom 36px
2. h1 `VGC Bundesliga` — margin-bottom 36px
3. `<Button size="lg">Mit Discord anmelden</Button>` — default (primary = orange) variant, h-11+, px-7
4. Auth error (conditional): `text-destructive text-sm`, margin-top 20px: `Anmeldung fehlgeschlagen. Bitte versuche es erneut.`

No eyebrow, no tagline — deliberately minimal.

### Credit line (bottom-center, absolute)

Anchored 26px from the bottom of the viewport, centered: two skewed orange ticks (20×9px) flanking `AUSGERICHTET VON DER VGC GEMEINDE` — 13px, weight 600, uppercase, `tracking-[0.16em]`, `text-muted-foreground`.

### page.tsx reference markup

```tsx
<div className="relative flex flex-1 flex-col overflow-hidden">
  <div className="h-[3px] shrink-0 bg-brand-orange" />
  <header className="relative z-10 flex items-center justify-between border-b px-7 py-3">
    <div className="flex items-center gap-3">
      <Image src="/logo.svg" alt="Buli Hub" width={44} height={30} className="rounded-md" />
      <span className="text-[17px] font-semibold tracking-tight">Buli Hub</span>
    </div>
    {user ? <UserMenu identity={discordIdentityFromUser(user)} /> : <SignInButton variant="outline" />}
  </header>
  <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 text-center">
    <Image src="/logo.svg" alt="" width={148} height={102} className="mb-9 rounded-2xl shadow-xl" />
    <h1 className="mb-9 text-7xl leading-[1.05] text-brand-blue dark:text-white">
      VGC Bundesliga
    </h1>
    <SignInButton size="lg" />
    {auth_error ? (
      <p className="mt-5 text-destructive text-sm">
        Anmeldung fehlgeschlagen. Bitte versuche es erneut.
      </p>
    ) : null}
  </main>
  <div className="absolute inset-x-0 bottom-[26px] z-10 flex items-center justify-center gap-3">
    <div className="h-[9px] w-5 -skew-x-[18deg] bg-brand-orange" />
    <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      Ausgerichtet von der VGC Gemeinde
    </span>
    <div className="h-[9px] w-5 -skew-x-[18deg] bg-brand-orange" />
  </div>
  <img
    src="/logo.svg"
    alt=""
    aria-hidden
    className="pointer-events-none absolute -bottom-28 -right-24 z-0 w-[560px] -rotate-[10deg] rounded-[48px] opacity-5 dark:opacity-[0.06]"
  />
</div>
```

(`SignInButton` needs `variant`/`size` props forwarded to the inner shadcn `<Button>`.)

## 6. Component conventions (future pages)

- Strictly shadcn/ui components + tokens. No custom color values in components — tokens only (§1).
- Radius stays at shadcn default `--radius: 0.625rem`.
- Focus rings are orange (`--ring`) in both modes — free sporty accent, don't override.
- Buttons: default variant = orange primary in both modes. Destructive/outline/ghost as stock shadcn.
- Charts (future standings/stats): `--chart-1` blue, `--chart-2` orange, then supporting navy tints.
- Page headings: h1–h3 are automatically uppercase; don't fight it. For UI labels that must not be uppercase, use styled `div`/`p`, not heading tags.

## 7. Implementation checklist

1. `npm i` nothing — fonts come from `next/font/google`, zero deps
2. Replace `src/app/globals.css` with `handoff/globals.css`
3. Update `src/app/layout.tsx`: swap Geist for Montserrat (§2)
4. Copy `handoff/logo.svg` → `public/logo.svg`
5. Update `src/app/page.tsx` per §5
6. Forward `variant`/`size` props in `sign-in-button.tsx`
7. Verify both modes (`.dark` on `<html>`), run `npx biome check --write .` + `npx tsc --noEmit`

---

## 8. Go-live component system (the shared brand primitives)

These are the canonical decisions from the go-live design pass
(`design/go-live/GO-LIVE-POLISH.md` §2). They supersede the earlier ad-hoc
treatments; the listed shared components are the single source and must be used
instead of re-implementing the pattern per view.

### 8.1 Ticks — `<Tick>` (`src/components/tick.tsx`)

Always `skewX(-18deg)`. Exactly three sizes:

| Size | px (w×h) | Next to |
|---|---|---|
| S | 14×7 | micro labels 12–13px uppercase: status lines, kickers, nav, menu entries |
| M | 18×9 | section headers (h2), panel titles, empty-state cards |
| L | 22×11 | page titles (h1), landing credit |

Color: `orange` (active / you) · `neutral` = `bg-border` (informational /
inactive) · `navy` (staff / officiating).

### 8.2 Text on orange is white

`--primary-foreground: #ffffff`, for buttons, active pills/tabs, solid chips and
counters. Labels ≤ 12px sitting on solid orange are `font-semibold` minimum
(contrast). Orange is reserved for **actionable** surfaces — a disabled primary
button is a neutral chip, never washed-out orange (`Button` handles this).

### 8.3 Section header — `<SectionHeader>` (`src/components/section-header.tsx`)

The one component; replaced `StaffSectionHeader` / `SectionHeading` /
`SectionHead`. Tick M + h2 (`font-heading` bold uppercase `tracking-[0.03em]`
24px, `text-brand-blue dark:text-white`) + `border-b pb-3`, optional `meta`
(right, 13px muted) and `count` badge (`rounded-full bg-muted` pill, tabular).

### 8.4 Page titles

Two sizes only, `font-heading` condensed uppercase: **40px** standard · **34px**
compact when meta elements sit beside it. Dense tool headers (seeding workspace,
Auf-&-Abstieg dialog) stay **28px** — workspace chrome, not page titles.

### 8.5 Containers

Three widths, uniform `px-6`/`px-8`, `py-12`: **640px** narrow (Profil,
Anmeldung, Spieler wait states) · **760px** reading (Match, Legal) · **1040px**
wide (dashboards, Liga-Übersicht, Staff). Footer inner width follows the page
container.

### 8.6 Micro labels

Uppercase labels: `tracking-[0.12em]`, 12–13px, `font-semibold` everywhere.
Single exception: the landing credit keeps `tracking-[0.16em]`.

### 8.7 Links — `<InlineLink>` / `<ActionLink>` (`src/components/links.tsx`)

Two styles only. **Inline** (prose): brand-blue, `underline
underline-offset-[3px]`. **Action** (standalone): `font-semibold
text-brand-blue dark:text-white` + trailing „→", hover underline. Bare text
links that behave like buttons become outline buttons instead.

### 8.8 Empty / edge state — `<EmptyStateCard>` (`src/components/empty-state-card.tsx`)

One pattern: card `rounded-xl border px-8 py-7`, tick M (orange = action
available, neutral = informational) + condensed title 22–24px + relaxed muted
body + optional single action. Replaces bare sentences and the dashed-border
special case.

### 8.9 Zone palette (standings) — tokens in `globals.css`

Decoupled from brand orange so orange keeps meaning „active / you":

| Zone | Token | Value |
|---|---|---|
| Meister-Playoff | `--zone-champion` | `oklch(0.85 0.16 90)` (yellow) |
| Aufstieg direkt | `--zone-promote` | `oklch(0.6 0.12 158)` (green) |
| Auf-/Abstiegs-Playoff | `--zone-playoff` | `oklch(0.78 0.13 78)` (amber) |
| Abstieg direkt | `--zone-demote` | `oklch(0.55 0.19 27)` (red) |

Row treatment: 6px left rail + row tint at /7–/10 alpha; legend below the table
(14×5px swatches, 12.5px labels). Zone information is never color-only — legend
text + rail position carry it too.

### 8.10 Name fallback — `playerName()` (`src/lib/player-name.ts`)

Every player-name render uses the chain `displayName → username →
„Discord-Nutzer"`; never an empty cell or ad-hoc „Unbekannt".
