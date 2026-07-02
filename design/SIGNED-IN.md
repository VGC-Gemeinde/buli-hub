# Buli Hub — Signed-in screens (design handoff, iteration 2)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still valid).
This doc covers three changes against current `main` (c40b9fc): the user menu,
the logged-in home, and the Profil page styling. Reference design: project file
"App Screens.dc.html" (1a home, 1b profil).

---

## 1. User menu → chip + dropdown (replaces current `user-menu.tsx`)

Current state (avatar + name link + permanent "Abmelden" outline button) is replaced
by a single trigger chip opening a shadcn `DropdownMenu`.

**Install:** `npx shadcn@latest add dropdown-menu` (only new dependency).

### Trigger chip
- One `<button>` (DropdownMenuTrigger asChild): avatar 28px + display name + chevron-down icon
- Layout: `flex items-center gap-2 rounded-md py-1 pl-1 pr-2.5`
- Name: `text-sm font-medium`; chevron: `size-3.5 text-muted-foreground`, rotates 180° while open
- Hover AND open state: `bg-secondary` (transparent otherwise)
- Chevron: use `ChevronDown` from lucide-react (already a shadcn dependency)

### Dropdown content
- `align="end"`, width ~192px (`w-48`), 6px below the chip
- Structure:
  1. `DropdownMenuLabel` — `Angemeldet als {name}` — 12px, `text-muted-foreground`, weight 500
  2. `DropdownMenuSeparator`
  3. Item **Profil** → `/profil` (Link)
  4. Item **Abmelden** → submits the existing `signOut` server action
- Items: 14px, weight 500, standard shadcn item styling (hover = `bg-accent`)
- Keep stock shadcn popover tokens: `bg-popover`, `border-border`, `rounded-lg`, shadow

Sign-out therefore leaves the permanent chrome — this is intentional; don't re-add
a header button. `SiteHeader` signed-out branch is unchanged.

## 2. Logged-in home (`src/app/page.tsx`, `user` branch)

Currently the hero shows `SignInButton` even when authenticated. Split the hero by
auth state; everything else on the page (SiteHeader, credit line, watermark) is
identical in both branches.

Signed-in hero, top to bottom (same centered column):
1. Logo badge — **132px**, `rounded-2xl`, shadow (slightly smaller than signed-out 148px)
2. h1 `VGC Bundesliga` — 60px (`text-6xl`), margin-bottom ~18px
3. Muted line, 17px, max-w-[440px], `text-muted-foreground`:
   `Die Liga-Features sind in Arbeit. Sobald die erste Saison startet, geht es hier los.`

No CTA, no cards, no placeholder sections — deliberately an empty state.

## 3. Profil page styling (`/profil` — structure already implemented, keep it)

Layout stays `max-w-xl` centered, `py-12`. Adjustments only:

### ProfileHeader
- Already correct (avatar 80px + h1 name). h1 inherits condensed-uppercase from
  globals; color `text-brand-blue dark:text-white`. Keep truncation.

### Einstellungen section header
- Add the signature orange tick before the h2 and a bottom border under the row:

```tsx
<div className="flex items-baseline justify-between border-b pb-3.5">
  <div className="flex items-center gap-2.5">
    <div className="h-[9px] w-[18px] -skew-x-[18deg] bg-brand-orange" />
    <h2 className="text-[26px] tracking-[0.03em]">Einstellungen</h2>
  </div>
  <SaveIndicator status={status} />
</div>
```

- SaveIndicator unchanged (idle renders nothing; Speichern…/Gespeichert muted,
  error destructive).

### Fields
- Stock shadcn `Input`/`Label`/`Select` — no restyling needed; tokens do the work
  (orange focus ring comes from `--ring`).
- Twitter/X input: add a static `@` prefix — wrap input in a flex container styled
  like an input (`border-input rounded-md border`) with `<span className="text-muted-foreground">@</span>`
  and an unstyled inner input, or use padding + absolutely-positioned span. The
  stored value keeps stripping `@` in `settings.ts` (already handled).
- Bluesky + Herkunft: unchanged behavior; "Andere" free-text branch keeps its
  current placement directly under the select.

## 4. Checklist

1. `npx shadcn@latest add dropdown-menu`
2. Rewrite `src/features/auth/components/user-menu.tsx` per §1 (client component;
   signOut form inside the menu item — use `<DropdownMenuItem asChild>` around a
   form button so the server action still works)
3. Split hero in `src/app/page.tsx` per §2
4. Profil tweaks per §3 (`settings-form.tsx` header row + @-prefix input)
5. Verify both modes, `npx biome check --write .`, `npx tsc --noEmit`, `npm test -- --run`
