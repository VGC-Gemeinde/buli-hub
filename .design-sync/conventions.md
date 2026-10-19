## Conventions for building with this design system

This is the **VGC Gemeinde** design system — the real component library behind
*Buli Hub*, the VGC Bundesliga tournament platform. The product is **German**:
write UI copy in German unless asked otherwise.

### Setup

Styling needs no provider or theme wrapper. Link `styles.css` and load
`components/bundle.js`; the components then style themselves. `styles.css` already
pulls in the tokens, the component CSS, and self-hosted **Montserrat** — do not
add a font import.

**Dark mode** is a class, not a context: put `class="dark"` on an ancestor
(usually `<html>`). Every token below has a dark value, so a correct build needs
no per-element dark styling beyond the occasional `dark:` utility.
`tokens.css` declares those dark values under `[data-theme="dark"]`, so set
`data-theme="dark"` on the same element as `class="dark"`.

**Components that read the URL** (`BackLink`, `SectionNav`, `StatsFilters`)
call Next's router hooks and throw outside a router. Wrap them, or the whole
screen, in `NextAppRouter` from the bundle. `pathname` is the page the screen
claims to be on (it picks the active navigation entry), `search` is the query
string the filters read:

```jsx
<NextAppRouter pathname="/statistiken/pokemon" search="phase=regular">
  <StatsFilters … />
</NextAppRouter>
```

### Styling idiom: Tailwind v4 utilities over semantic tokens

Style with utility classes. **Never hardcode a hex color** — the palette is
reached only through these token names:

| Family | Names |
|---|---|
| Surfaces | `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `muted`, `muted-foreground` |
| Actions | `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `accent`, `accent-foreground`, `destructive` |
| Lines | `border`, `input`, `ring` |
| Brand | `brand-blue` (#021f66 falinks-blue), `brand-orange` (#ff7b00 pawmo-orange) |
| League zones | `zone-promote`, `zone-playoff`, `zone-demote`, `zone-champion` |
| Form results | `form-win`, `form-loss` (a won or lost match in a form strip, always with a ✓/✗ glyph) |
| Pokémon types | `type-normal`, `type-fire`, `type-water`, `type-grass`, `type-electric`, `type-ice`, `type-fighting`, `type-poison`, `type-ground`, `type-flying`, `type-psychic`, `type-bug`, `type-rock`, `type-ghost`, `type-dragon`, `type-dark`, `type-steel`, `type-fairy` (only for things of that type, never as decoration) |

Used as `bg-*`, `text-*`, `border-*`, `ring-*` — e.g. `bg-card`,
`text-muted-foreground`, `border-border`, `bg-brand-orange`.

**Brand vs. primary.** `primary` IS pawmo-orange in both modes and belongs to
interactive elements — buttons, focus rings. `brand-blue` is *structural*:
headings, logo surfaces, dark panels. Reach for `text-brand-blue dark:text-white`
on headings and `bg-brand-orange` for decorative accents.

**The class vocabulary is finite.** The stylesheet is compiled from this
repo plus an explicit safelist covering ordinary layout, spacing, sizing, type,
border/radius/shadow and the tokens above. Utilities outside it — arbitrary
values like `gap-[13px]`, or stock palette colors like `bg-teal-300` — **resolve
to nothing and silently render unstyled**. Stay inside the vocabulary; if you
need a color that isn't there, you are choosing off-brand.

### Signature visual elements

These, not just the colors, are what make a screen look like VGC Gemeinde:

1. **Skewed orange ticks** — `<Tick />` flanking an uppercase, letter-spaced
   label. Sizes `s` / `m` / `l`, colors `orange` (default) / `neutral` / `navy`.
   Never a bare tick: it always sits beside a label. `SectionHeader` does this
   for you and is the right way to title a section.
2. **Uppercase condensed headings** — `h1`–`h3` are automatically uppercase with
   `letter-spacing: 0.02em` in Montserrat 700. Don't fight it; for a label that
   must not be uppercase, use a styled `div`/`p` instead of a heading tag.
3. **Top accent line** — a 3px `bg-brand-orange` strip across the top of a page.
4. **Orange = positive, blue = negative.** Wins, CTAs and active states are
   orange; losses and structure are blue. Never green/red for match results.

Do NOT add: gradients, emoji, or rounded cards with left-border accents.

### Where the truth lives

- `styles.css` and its imports — the real tokens and component CSS.
- `tokens.json` — the brand colours (light and dark), `radius`, `spacing` and the
  two font stacks, compiled to `tokens.css`; edit them there.
- `guidelines/design/DESIGN.md` — the brand's own source of truth (palette,
  type scale, signature elements). Other files in `guidelines/` cover specific
  flows; read them before building a whole screen.
- `components/<Name>/README.md` — per-component usage, and
  `components/<Name>/<Name>.d.ts` for the exact props. Read these before using a component.

### An idiomatic composition

```jsx
<section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
  <SectionHeader meta="Division 1a">Tabelle</SectionHeader>
  <p className="text-sm text-muted-foreground">
    Spieltag 2 von 4 — die Ergebnisse werden laufend aktualisiert.
  </p>
  <div className="flex items-center gap-3">
    <Button>Ergebnis melden</Button>
    <Button variant="outline">Spielplan ansehen</Button>
  </div>
</section>
```

Library components carry the design language; your own glue is layout only
(`flex`, `gap-*`, `p-*`, `rounded-*`, `border-border`, `bg-card`).
