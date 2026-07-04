# Buli Hub — Auf- & Abstieg + Divisionstabelle (design handoff)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still valid).
This doc is the design pass over the shipped **post-season setup** and
**division table** features (`docs/plans/post-season-setup.md`,
`docs/plans/division-table.md`). Domain logic (`post-season.ts`, standings,
queries, actions, finalize gating) is correct as-is; only views change.
Reference designs: project files **"Auf- & Abstieg (Staff).dc.html"** and
**"Divisionstabelle (Spieler).dc.html"** — both interactive, use the tweaks to
see all states (unequal groups, Gruppentabelle mode).

---

## 1. Zone palette (new tokens, `globals.css`)

Replaces the ad-hoc `emerald-500` / `amber-500` / `destructive` tints from the
functional build. Three zone colors, navy-compatible chroma:

```css
--zone-promote: oklch(0.55 0.12 158);  /* guaranteed promotion — green   */
--zone-playoff: oklch(0.8 0.13 79);    /* both playoff bands — amber     */
--zone-demote:  oklch(0.55 0.19 27);   /* guaranteed demotion — red      */
```

Expose as `bg-zone-*` / `text-zone-*` utilities next to `bg-brand-*`. The two
playoff bands deliberately share one amber — position (top vs bottom) plus the
legend disambiguate. Text on promote/demote fills is white; on playoff fills
it is `text-brand-blue`.

## 2. Staff — Auf- & Abstieg (`post-season-dialog.tsx`)

The number-grid dialog becomes a **ladder**: one card per division, stacked by
tier, with a **seam row** between adjacent cards that shows whether their
exchange balances. Everything staff types is mirrored visually before they
save. Keep the existing `Dialog` shell, trigger (configured-dot button) and
save flow; the content column is `max-w-[1060px]` on a `bg-muted/40` body.
Intro line under the title (replaces the current `DialogDescription`):

> Lege pro Division fest, wie viele Spieler fest auf- und absteigen, wie viele
> Playoff-Plätze es gibt und über welche Tabelle entschieden wird. Abstiege und
> Aufstiege benachbarter Divisionen müssen sich decken — erst dann kann die
> Einteilung finalisiert werden.

### 2.1 Division card

`rounded-xl border bg-card shadow-2xs`, two rows divided by `border-t`.

**Header row** (`flex items-center gap-3 px-5 py-3`):

- Navy tick `<div className="h-2.5 w-5 -skew-x-[18deg] bg-brand-blue" />` +
  `font-heading text-xl uppercase tracking-[0.04em] text-brand-blue`
  **Division {tier}** + meta `text-[12.5px] text-muted-foreground`
  ("2 Gruppen · je 8 Spieler" / "2 Gruppen · 8 / 7 Spieler").
- Right: label **Maßgebliche Tabelle** (11px semibold uppercase, muted) + pill
  segmented control (`rounded-full border p-[3px]`, segments `h-[26px]
  rounded-full px-3 text-[12.5px] font-semibold`): **Gruppentabelle** |
  **Gesamttabelle**. Active = `bg-brand-blue text-white`. Gesamttabelle
  disabled (`opacity-40 cursor-not-allowed` + title „Nur bei mindestens zwei
  gleich großen Gruppen verfügbar") when `divisionModeAvailable` is false.

**Body row** (`flex flex-col gap-3 px-5 py-4`):

1. Strip label, 11.5px semibold uppercase muted: **Zonen-Vorschau · pro Gruppe
   (8 Plätze)** / **· ganze Division (16 Plätze)** — this line carries the
   per-group vs per-division semantics, so it must re-render with the toggle.
2. **Zone preview strip** — one square per table place (capacity = smallest
   group in Gruppen mode, whole division in Gesamt mode). Squares
   `h-[30px] rounded-[7px] border text-[11.5px] font-semibold`, width 34px
   (≤10 places) / 28px (≤16) / 22px (more), `flex-wrap`. Place number inside;
   `title` names the zone („Platz 3 — Aufstiegs-Playoff"). Fills: promote
   solid `bg-zone-promote text-white`, playoff `bg-zone-playoff
   text-brand-blue`, demote `bg-zone-demote text-white`, rest `bg-muted
   text-muted-foreground`. **Overbooked overlap** (spans exceed capacity)
   renders as red/amber diagonal stripes
   (`repeating-linear-gradient(45deg, var(--zone-demote) 0 4px,
   var(--zone-playoff) 4px 8px)`) — the capacity error made visible.
3. **Stepper row**, laid out in table order so controls map onto the strip:
   `Direkter Aufstieg · Aufstiegs-Playoff · [spacer] · Abstiegs-Playoff ·
   Direkter Abstieg`. Each cluster (`w-[148px] flex flex-col gap-1.5`):
   - Zone dot `size-2.5 rounded-[3px] bg-zone-*` + 11px uppercase label.
   - Stepper: `− | value | +` in one `rounded-lg border` group; value cell
     `w-[38px] text-center font-semibold` with `border-x`; buttons 30px wide,
     ghost. Replaces the raw `<Input type="number">` — clamps at 0, no
     keyboard-only affordance needed at these magnitudes.
   - Note line, 11.5px muted: disabled reason (**Oberste Division — kein
     Aufstieg** / **Unterste Division — kein Abstieg**, whole cluster
     disabled) or the effective total (**× 2 Gruppen = 4 gesamt** in Gruppen
     mode, **gilt für die ganze Division** in Gesamt mode).
   - Spacer center: `{n} Plätze Klassenerhalt` (12px muted); negative →
     `Überbelegt um {n} — Zahlen verringern` in `text-zone-demote font-bold`.

### 2.2 Seam row (between adjacent cards)

`grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-8 py-2`:

- Left, right-aligned: `↓ {n}` (`font-bold text-zone-demote`) + **steigen ab
  (2 je Gruppe × 2 Gruppen)** / **(Division gesamt)** in 12px muted.
- Center: balance chip, uppercase 11.5px bold pill — balanced:
  **✓ Ausgeglichen** (`border-zone-promote/40 bg-zone-promote/5
  text-zone-promote`); else **✕ Differenz {n}** in the demote red variants.
- Right: `↑ {n}` (`font-bold text-zone-promote`) + **steigen auf (…)**.

The seam replaces the abstract per-row „Bilanz ↑ 4 · ↓ 4" column: the invariant
`demotions(t) == promotions(t+1)` is judged **at the boundary it concerns**.

### 2.3 Footer / validation

- Valid: green check disc (`size-[18px] rounded-full bg-zone-promote
  text-white`) + **Regeln gültig — nach dem Speichern kann die Einteilung
  finalisiert werden.**
- Invalid: the issue list (existing `messageForIssue` texts, plus the balance
  message spelled with both numbers: „Division 1 & 2: 4 Abstiege stehen 2
  Aufstiegen gegenüber — die Zahlen müssen sich decken.") in
  `text-destructive text-[13px]`, `max-h-16 overflow-auto`, no box border —
  the errors are already localized at seams/strips.
- Right: **Ungespeicherte Änderungen** hint (12.5px muted, only when valid +
  dirty) + primary **Speichern**, disabled while invalid; after a successful
  save the button reads **Gespeichert ✓** (outline, `border-zone-promote/40
  text-zone-promote`) until the next edit.

Boundary rule is enforced by the disabled clusters (top/lowest), so
`boundary` issues can no longer occur from this UI.

## 3. Player — Tabelle (`standings-panel.tsx`)

### 3.1 `StandingsTable`

- **Zone rail**: 6px colored bar flush left of every zoned row
  (`bg-zone-*`), plus a soft row tint — promote `bg-zone-promote/7`, playoff
  `bg-zone-playoff/10`, demote `bg-zone-demote/6`. Rail + tint together read
  as league-table zones without drowning the row. On the sticky rank/player
  cells keep the existing `before:` overlay technique for the tint; the rail
  sits on the rank cell's left edge.
- **Me row**: unzoned → orange rail (`bg-brand-orange`) + existing
  `bg-brand-orange/6` tint. Zoned → zone visuals win; bold name, **Du** badge
  and filled avatar keep the row findable (unchanged).
- New **Diff.** column stays as shipped.
- **Gruppe chip** (division view only): after the player name,
  `rounded-full bg-muted px-[7px] py-[2px] text-[10.5px] font-bold
  text-muted-foreground` showing the sub-division („2a"). Answers "who is from
  my group?" in the merged table; omit in the group view.

### 3.2 Legend (`ZoneLegend`)

Swatches become short bars (`h-[5px] w-3.5 rounded-[3px] bg-zone-*`), 12.5px
muted labels, only zones actually present, but the playoff bands are **named
separately**: **Direkter Aufstieg · Aufstiegs-Playoff · Abstiegs-Playoff ·
Direkter Abstieg**.

### 3.3 `StandingsPanel` — switcher + context line

- Segmented control matches the staff pill (rounded-full border, `p-[3px]`),
  active segment `bg-brand-orange text-brand-blue` (primary-foreground is
  navy, not white — see DESIGN.md §1). The segment of the **relevant** table
  carries a small skewed tick (`h-[7px] w-3.5 -skew-x-[18deg]`,
  `bg-brand-orange` when inactive, `bg-brand-blue` when active) — the „this
  one decides" marker.
- One-line context under the section header, 13px muted, three variants:
  - division mode, division view: **Auf- und Abstieg wird über die
    Gesamttabelle der Division entschieden — die markierten Plätze gelten.**
  - division mode, group view: **Nur zur Orientierung — Auf- und Abstieg wird
    über die Gesamttabelle (Division 2) entschieden.**
  - sub-division mode: **Auf- und Abstieg wird innerhalb deiner Gruppe
    entschieden — die markierten Plätze gelten.**
- Defaults, visibility and zone placement stay exactly as shipped (relevant
  table only; no switcher in sub-division mode).

## 4. Checklist

1. `globals.css`: `--zone-promote/playoff/demote` + utilities (§1)
2. `post-season-dialog.tsx`: ladder layout — division cards with table toggle,
   zone preview strip, steppers with effective-total notes (§2.1); seam rows
   with balance chips (§2.2); footer states + Gespeichert ✓ (§2.3)
3. `standings-panel.tsx`: zone rail + tints, Gruppe chip, split playoff legend
   labels, switcher tick + context line (§3)
4. `/dev/ui` gallery: card with overbooked stripe state, seam
   balanced/unbalanced, table in all three context variants
5. Verify both modes, `npx biome check --write .`, `npx tsc --noEmit`,
   `npm test -- --run`
