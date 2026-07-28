## Conventions for building with this design system

This is the **VGC Gemeinde** design system — the real component library behind
*Buli Hub*, the VGC Bundesliga tournament platform. The product is **German**:
write UI copy in German unless asked otherwise.

### Setup

No provider or theme wrapper is required. Link `styles.css` and load
`_ds_bundle.js`; the components then style themselves. `styles.css` already
pulls in the tokens, the component CSS, and self-hosted **Montserrat** — do not
add a font import.

**Dark mode** is a class, not a context: put `class="dark"` on an ancestor
(usually `<html>`). Every token below has a dark value, so a correct build needs
no per-element dark styling beyond the occasional `dark:` utility.

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
- `guidelines/design/DESIGN.md` — the brand's own source of truth (palette,
  type scale, signature elements). Other files in `guidelines/` cover specific
  flows; read them before building a whole screen.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage, and
  `<Name>.d.ts` for the exact props. Read these before using a component.

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
