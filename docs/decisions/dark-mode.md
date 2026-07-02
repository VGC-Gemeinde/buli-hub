# Dark mode: media strategy, not class strategy

**Decided:** 2026-07-02

`design/DESIGN.md` specifies the `.dark` class strategy, but nothing in the
app ever set that class — dark mode was unreachable without adding a theme
switcher (JS + a dependency like next-themes).

Decision: dark mode follows the OS via `@media (prefers-color-scheme: dark)`,
pure CSS. In `src/app/globals.css` the dark token block is wrapped in the
media query and the `@custom-variant dark` line is removed (Tailwind's `dark:`
variant is media-based by default).

Trade-off, accepted deliberately: **no manual light/dark toggle is possible**
with this strategy. If a toggle ever becomes a requirement, switch back to the
class strategy and add next-themes — that migration is small and mechanical.
