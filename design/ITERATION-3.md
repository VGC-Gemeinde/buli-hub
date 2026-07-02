# Buli Hub — Handoff, iteration 3

Against `main` @ 683942c. Two features: theme toggle, profile copy/structure rework.
Reference designs: "App Screens.dc.html" (1b Profil) and "Landing Page.dc.html" (4a header).
`DESIGN.md` tokens/fonts unchanged.

---

## 1. Theme toggle in the site header (both auth states)

A ghost icon button in `SiteHeader`, left of the auth slot (UserMenu / SignInButton),
6px gap. Toggles light ↔ dark; system preference remains the default until first use.

- **Dependency:** `next-themes` (exact-pinned). Wrap the app in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` in `layout.tsx`; add `suppressHydrationWarning` to `<html>`.
- **Button:** shadcn `<Button variant="ghost" size="icon">` (36px), client component:
  - Light mode showing: `Sun` icon (lucide, 17px)
  - Dark mode showing: `Moon` icon
  - `aria-label="Theme wechseln"`
  - onClick: `setTheme(resolvedTheme === "dark" ? "light" : "dark")`
  - Render the icon only after mount (`useEffect` mounted flag) to avoid hydration mismatch — standard next-themes pattern.
- Icon color `text-foreground`, hover `bg-secondary` (ghost default is fine).
- The current `.dark` class strategy in globals.css already matches `attribute="class"` — no CSS changes.

## 2. Profil page: section rework (`settings-form.tsx`)

### Heading
- `Einstellungen` → **`Für die Orga`** (aria-label of the section likewise).

### Disclaimer (new, directly under the heading row)
```
Alle Angaben hier sind freiwillig.
```
`text-sm text-muted-foreground`, sits between the header row and the first field.

### Field grouping + helper texts
The two handle fields become one visual group with a single shared helper below;
Herkunft keeps its own helper. Vertical rhythm: 14px (`gap-3.5`) inside the handle
group, 24px (`gap-6`) between sections — the tighter spacing is what makes the
shared helper read as belonging to both fields.

```
Für die Orga                                   Gespeichert
Alle Angaben hier sind freiwillig.

Twitter/X-Handle
[@ input]
Bluesky-Handle
[input]
Über deine Handles können wir dich in Social-Media-Posts erwähnen.   ← shared, one line

Herkunft
[select]
Zeigen wir in Content wie YouTube-Videos oder Twitch-Streams.
```

Helper text styling: 13px (`text-[13px]`), `text-muted-foreground`, `leading-snug`.

No schema, action, or validation changes — copy and layout only.

## 3. Checklist

1. `npm install next-themes` (exact version)
2. `layout.tsx`: ThemeProvider + `suppressHydrationWarning`
3. New `theme-toggle.tsx` client component (lib-level or components/), added to `site-header.tsx` per §1
4. `settings-form.tsx` rework per §2
5. Verify: toggle works signed-in and signed-out, both pages; no hydration warning in console
6. `npx biome check --write .`, `npx tsc --noEmit`, `npm test -- --run`
