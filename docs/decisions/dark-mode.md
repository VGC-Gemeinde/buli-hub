# Dark mode: class strategy via next-themes

**Decided:** 2026-07-02

Dark mode uses the `.dark` class strategy from `design/DESIGN.md`, managed by
`next-themes`: the system preference is the default, and a header toggle lets
users override it (persisted in localStorage).

- `src/app/globals.css` defines the dark tokens under `.dark` and restores
  Tailwind's class-based `dark:` variant via `@custom-variant`.
- `ThemeProvider` (`attribute="class" defaultTheme="system" enableSystem`)
  wraps the app in `layout.tsx`; `<html>` carries `suppressHydrationWarning`
  because next-themes sets the class before hydration.
- next-themes also manages the `color-scheme` style on `<html>`, so native UI
  (scrollbars, form controls) follows the active theme — no manual
  `color-scheme` declaration in CSS.

A pure-CSS `prefers-color-scheme` media strategy was considered and rejected:
it cannot support a manual toggle, which the design requires.
