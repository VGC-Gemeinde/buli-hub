# Buli Hub — Divisions-Einteilung: geführter Ablauf (design handoff)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still valid),
`DIVISIONS-EINTEILUNG.md` (the sheet — §1–§5 unchanged) and `AUF-ABSTIEG.md`
(the rules ladder — §2 unchanged). This doc is the design pass over the
**guided seeding workflow** on current `main`: the step bar, the control lock,
the embedded Auf- & Abstieg view and the finalize gate. Domain logic
(`steps.ts`, `control.ts`, `post-season.ts`, actions, queries) is correct
as-is; **only views change**. Reference design: project file
**"Divisions-Einteilung v2.dc.html"** (interactive — placement, generation,
rules, control handover and finalize all work with 180 demo players; use the
tweaks *Demo-Zustand* and *Steuerung* to jump between states).

The core idea of this pass: the workflow strip stops being a row of small
chips squeezed into the title row and becomes a **first-class stepper row**
that answers three different questions without mixing them up — *how far am
I?* (numbered circles + per-step progress), *where am I?* (highlighted view
segment), and *what's still blocking finalize?* (readable inline, not
tooltip-only). The control lock shrinks from a full-width strip to a status
pill, giving one chrome row back to the sheet.

---

## 1. Page chrome (`seeding-toolbar.tsx`)

- The back link loses its own row and becomes a **breadcrumb inside the title
  row**: `ChevronLeft` (13px) + **Staff-Bereich**, `text-[13px] font-medium
  text-muted-foreground hover:text-foreground`, followed by a divider
  `h-[18px] w-px bg-border`, then the existing tick + h1 + season label
  (unchanged). Title row: `flex items-center gap-4 px-7 pt-3.5 pb-2.5`.
- Right side of the title row: the **control pill** (§3). The `ControlBar`
  strip below the toolbar is removed.
- The two `Meter` components are **gone** — placement/grouping progress lives
  in the step bar (§2). Nothing else in the title row.

Resulting header stack: site chrome → title row → step bar → contextual
toolbar → content. One row less than current `main`, and every row has one
job.

## 2. Step bar (`step-bar.tsx`) — its own full-width row

Own strip between title row and contextual toolbar:
`flex items-center gap-1 border-b px-7 pt-1 pb-2.5`.

### 2.1 Step anatomy

Each step = numbered circle + two-line text block, `flex items-center gap-2.5`:

- **Circle**, 22px, `rounded-full border-2 text-[11.5px] font-bold`:
  - done → `border-brand-orange bg-brand-orange text-white`, content **✓**
  - active → `border-brand-orange bg-background text-brand-orange`, content
    is the **step number**
  - pending → `border-muted-foreground/30 text-muted-foreground`, number.

  Numbers (1–4) instead of the current dot/ring — they make the strip read as
  a sequence at a glance. Done/active/pending semantics from `seedingSteps`
  are unchanged (steps complete independently; active = first incomplete).
- **Label**: `font-heading text-[14.5px] uppercase tracking-[0.05em]
  leading-none` — `text-foreground` when done/active, `text-muted-foreground`
  when pending. Step 2 is relabelled **Gruppen bilden** (verb, matches
  „Platzieren“; was „In Gruppen“).
- **Sublabel** under the label, `text-[11.5px] text-muted-foreground`. Steps
  1 + 2 render progress instead of plain text: a 52×3px `rounded-full
  bg-muted` track with fill (`bg-brand-orange` for Platzieren,
  `bg-brand-blue dark:bg-white/80` for Gruppen bilden — the old meter colors)
  next to a tabular `{n}/{total}`.

### 2.2 View segments (the navigation part)

Steps 1+2 share one `<button>` (they live in the sheet view), step 3 has its
own (rules view). Segment: `flex items-center gap-3 rounded-[10px] border
px-3.5 py-1.5`, `aria-pressed`, `title` „Ansicht: Spieler platzieren und
Gruppen bilden“ / „Ansicht: Auf- und Abstiegsregeln festlegen“.

- **Active view**: `border-brand-orange/40 bg-brand-orange/5` **plus** an
  inset bottom rule `shadow-[inset_0_-2px_0_var(--brand-orange)]` — the
  „you are here“ marker, deliberately distinct from the circles (which mean
  progress, not location). Both steps inside the sheet segment highlight
  together.
- Inactive: `border-transparent hover:border-border hover:bg-muted`.
- Between step 1 and 2 inside the sheet segment: small `ChevronRight` (13px,
  `text-muted-foreground/40`). Between segments: `ChevronRight` 15px,
  `text-muted-foreground/50`.

Clicking segments only switches the view (local state, observers included) —
unchanged from `main`.

### 2.3 Step 3 sublabel — live rules status

The sublabel mirrors the rules panel so step bar and panel tell one story:

| state | sublabel |
|---|---|
| saved, no local edits | `Regeln gespeichert` |
| saved, unsaved edits | `Änderungen nicht gespeichert` |
| not saved, groups missing | `Zuerst Gruppen bilden` |
| not saved, validation issues | `{n} Punkt(e) zu klären` in `text-[oklch(0.55_0.13_50)]` |
| not saved, valid | `Noch speichern` |

Requires lifting the panel's validation/dirty state up (§6, implementation
note).

### 2.4 Step 4 — Finalisieren (gated action, not a view)

No segment styling — it must read as an action, not navigation. Three states:

1. **Ready + controlling**: active circle „4“ + primary `Button`
   **Finalisieren…** (`size` default, h-34px), opens the existing
   `FinalizeDialog`. `title`: „Endgültig — kann nicht rückgängig gemacht
   werden.“
2. **Not ready, or observing** (not finalized): plain step — circle + label
   **Finalisieren** + sublabel with the **short gate reason**, so the blocker
   is readable without hovering:
   - `Noch {n} platzieren` → `Noch {n} ohne Gruppe` → `Regeln noch speichern`
   - ready but observing: `Übernimm die Steuerung, um zu finalisieren`
   - 0 registrations: `Keine Anmeldungen`

   Add this as `finalizeGateShort(progress)` next to `finalizeGateHint` in
   `steps.ts` (same inputs, same story); the long hint stays as `title`.
3. **Finalized**: the existing chip — skewed orange tick +
   **Finalisiert · endgültig** in `rounded-[10px] border border-brand-orange/40
   bg-brand-orange/5 px-3 py-2 text-[13px] font-semibold`.

Right edge of the strip, after a spacer: flow hint `text-[12px]
text-muted-foreground/70` — **Schritte 1–3 abschließen, dann finalisieren**
(hidden once finalized).

## 3. Control pill (`control-bar.tsx`)

The full-width `Bar` strip becomes a **pill in the title row**:
`flex items-center gap-2 rounded-full border py-[5px] pl-3 pr-1.5`, content =
8px status dot + `text-[13px]` message + small action button. Hidden when
finalized (nothing left to control).

| state | pill | dot | text | action |
|---|---|---|---|---|
| self | `border-brand-orange/40 bg-brand-orange/5` | `bg-brand-orange` | Du steuerst die Einteilung | `Button variant="outline" size="sm"` **Freigeben** |
| held-by-other | `border-amber-500/40 bg-amber-500/5` | amber | **{Name}** steuert, du beobachtest | primary sm **Übernehmen** → `ConfirmTakeover` |
| free / stale | `border bg-muted/40` | `bg-muted-foreground/40` | Niemand steuert, du beobachtest | primary sm **Steuerung übernehmen** → `ConfirmAcquire` |

Holder name `font-semibold text-foreground`, rest muted-toned. Both confirm
dialogs are **unchanged** (titles, copy, button labels). The lucide
Radio/Lock/Eye icons are dropped — the dot + tone carry the state; the pill
is too small for icon + dot + text + button.

Rationale: the lock is a page-wide *mode*, and the disabled controls already
communicate it locally; a persistent pill next to the title states it without
costing a full chrome row. The takeover CTA stays one click away.

## 4. Contextual toolbar row

Exactly one contextual row under the step bar; its content follows the view:

- **Sheet view** (not finalized): the config/search row as shipped —
  Divisionen / Gruppengröße inputs, Spieltage hint, „Alle Gruppen
  generieren“, search, filter pills. Observer mode: config inputs +
  generate-all `disabled` at `opacity-55`; **search + filter stay usable**
  (behavior unchanged, now visually consistent with the rest).
- **Rules view** (not finalized): the `PostSeasonPanel` action strip as
  shipped (verdict disc + text, Ungespeicherte Änderungen, Speichern /
  Gespeichert ✓). Copy nit: invalid verdict reads
  „{n} Punkt(e) zu klären — Details in der Liste unten.“
- **Finalized** (either view): both rows replaced by the notice strip in the
  same slot — `border-b border-brand-orange/40 bg-brand-orange/5 px-7 py-2
  text-[13.5px]`: „Die Einteilung wurde am {Datum} finalisiert und ist
  endgültig.“ (was rendered below the toolbar; moving it up keeps the header
  a fixed three-row stack).

## 5. Sheet read-only states (`sheet-rows.tsx`)

Two distinct read-only flavors, now fully specified:

- **Observer** (someone else controls / nobody controls):
  - rows not `draggable`, `cursor-default`;
  - **checkbox column empty** (hidden, not disabled — nothing actionable);
  - Division/Gruppe selects `disabled` at `opacity-60`;
  - generate buttons on division separators **hidden**;
  - bulk bar never shows.
- **Finalized** (terminal record): as observer, plus the selects render as
  **plain text** — `Division {tier}` / `{tier}{letter}`, dash
  (`text-muted-foreground/50`) when unset. No hover-grab affordances anywhere.

## 6. Rules view (`post-season-panel.tsx`) — light touches

The ladder itself already matches `AUF-ABSTIEG.md` §2 — cards, zone preview,
steppers, seams all stay. Deltas:

- Intro sentence ends „… müssen sich decken — erst dann kann **gespeichert
  und finalisiert** werden.“ (the save is the step, not the dialog anymore).
- The no-groups notice gets an inline escape hatch: „Bitte zuerst die Gruppen
  generieren — … festlegen. **Zurück zum Sheet**“ (link, switches the view).
- Seam rows name the divisions explicitly — „↓ 8 **steigen aus Division 2
  ab**“ / „↑ 8 **steigen in Division 2 auf**“ — since the seam is now part of
  a longer scrolling ladder (up to 7 cards) instead of a two-division dialog.
  Balance chip labels: **Ausgeglichen** / **Nicht gedeckt**.
- **Implementation note**: step 3's sublabel (§2.3) needs the panel's
  validation + dirty state in `seeding-workspace.tsx`. Either compute
  `validatePostSeason` + a fingerprint diff in the workspace (the inputs are
  already there), or add an `onStatusChange({issues, dirty, saved})` callback
  from the panel. Both views stay mounted (unchanged), so state survives
  switching.

## 7. States to verify (tweaks in the reference DC)

- *Anfang*: step 1 active, rules view shows the no-groups notice, finalize
  sublabel counts unplaced players.
- *Alles eingeteilt*: steps 1+2 done ✓, step 3 active with issue count, seams
  show „Nicht gedeckt“, finalize blocked on rules.
- *Bereit zum Finalisieren*: steps 1–3 done, step 4 renders the primary
  button; complete the type-to-confirm dialog → chip + notice strip + static
  sheet.
- *Steuerung*: all three pill tones; observer sees disabled config, hidden
  checkboxes/generate buttons, working search/filter; ready-but-observing
  shows the „Übernimm die Steuerung…“ sublabel.

## 8. Checklist

1. `seeding-toolbar.tsx`: breadcrumb in title row, meters removed, control
   pill right (§1, §3); contextual row per view + finalized notice slot (§4)
2. `step-bar.tsx`: numbered circles, progress sublabels, segment
   active/hover treatment with inset bottom rule, chevron separators, flow
   hint (§2.1–§2.2)
3. `steps.ts`: `finalizeGateShort` beside `finalizeGateHint`; relabel
   „Gruppen bilden“ (§2.3–§2.4)
4. `control-bar.tsx` → pill component; dialogs unchanged; drop the strip (§3)
5. `sheet-rows.tsx`: observer vs finalized read-only rendering (§5)
6. `post-season-panel.tsx`: copy deltas, seam naming, view-switch link;
   lift validation status to the workspace for step 3 (§6)
7. `/dev/ui` gallery: step bar in all four progressions, three pill tones,
   finalize button/hint/chip variants, static player row
8. Both modes verified (dark: circles keep orange, segment tint resolves via
   tokens), `npx biome check --write .`, `npx tsc --noEmit`,
   `npm test -- --run`
