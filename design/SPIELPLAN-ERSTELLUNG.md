# Buli Hub — Spielplan-Erstellung (design handoff)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still valid),
`STAFF-BEREICH.md` and `DIVISIONS-EINTEILUNG.md`. This doc is the design pass
over the schedule feature against current `main` (7e3c2b4): the "Einteilung &
Spielplan" entry point and the `CreateScheduleDialog`. Domain logic
(`round-robin.ts`, `spieltage.ts`, `queries.ts`, `actions.ts`) is correct
as-is; **only views change**. Reference design: project file
**"Spielplan-Erstellung.dc.html"** (interactive — date pickers, deadline
shifting, type-to-confirm and the phase transition all work).

The core idea: the dialog fixes the **entire season calendar** in one terminal
action, so the season-level consequences must be readable while editing —
Saisonende live, week lengths at a glance, and visible feedback when one
deadline shifts everything after it. The type-to-confirm stays exactly as
implemented (`SCHEDULE_CONFIRMATION_PHRASE = "Spielplan erstellen"` — the
phrase commits to the action).

---

## 1. Entry point (`staff/page.tsx`, seeded phase)

The button row of "Einteilung & Spielplan" gains a consequence line so staff
knows what the terminal dialog will do *before* opening it:

```tsx
<div className="flex flex-col gap-3">
  <div className="flex flex-wrap gap-3">
    <Button asChild variant="outline"><Link href="/staff/seeding">Divisionen ansehen</Link></Button>
    <CreateScheduleDialog … />
  </div>
  <p className="text-[13px] text-muted-foreground">
    {k} Gruppen · {n} Spieltage · {m} Spiele. Die Saison startet mit der
    Erstellung des Spielplans.
  </p>
</div>
```

- `k` = roster count, `n` = `spieltagCount(sizes)`, `m` = total matches
  `Σ size·(size−1)/2` per roster — all derivable from the already-loaded
  `subDivisionRosters`; extend `scheduleSetup` with `{ groups, matches }`.
- Line renders only while `phase === "seeded"` (with the dialog).

## 2. Dialog frame (`create-schedule-dialog.tsx`)

- `DialogContent className="sm:max-w-[640px]"` — the season calendar is the
  content, not an afterthought; `max-w-md` stays too cramped for 23 rows.
- `DialogTitle`: **Spielplan erstellen?** (unchanged).
- `DialogDescription`, shortened — the deadline-shift explanation moves next
  to the list (§4) where it applies:

  > Für jede Gruppe wird ein einfaches Rundenturnier erzeugt und die reguläre
  > Saison startet sofort. Das kann nicht rückgängig gemacht werden.

Content order inside the dialog's `grid gap-4`: header → facts strip (§3) →
hint row + Spieltag list (§4) → `TypeToConfirm` (unchanged) → footer
(unchanged: **Abbrechen** / **Spielplan erstellen**, pending **Wird
erstellt…**, gate via `matchesConfirmationPhrase`).

## 3. Facts strip — the live season summary

```tsx
<div className="grid grid-cols-[1fr_1fr_1.25fr] gap-4 rounded-lg bg-muted px-4 py-3">
  <Fact label="Spieltage" value={String(count)} sub={`größte Gruppe: ${largest} Spieler`} />
  <Fact label="Saisonstart" value="Heute" sub={fmtDay(seasonStart)} />
  <Fact label="Saisonende" value={fmtDay(lastDeadline)} sub={`${seasonLength} Tage insgesamt`} />
</div>
```

- `Fact`: label `text-[11px] font-semibold uppercase tracking-[0.08em]
  text-muted-foreground`, value `text-[15px] font-semibold`, sub
  `truncate text-xs text-muted-foreground`.
- **Saisonende and season length update live** while deadlines are edited —
  this is the number staff is actually deciding on when they stretch weeks.
  `seasonLength = daysBetween(seasonStart, lastDeadline) + 1`.
- `fmtDay` renders **weekday-prefixed** dates everywhere in this dialog:
  `So. 30.08.2026` (date-fns `"EEEEEE. dd.MM.yyyy"`, locale `de`). Deadlines
  default to Sundays; the weekday makes that — and any deviation — visible.

## 4. Spieltag list

Hint row directly above the list (replaces the prose in the description):

```tsx
<div className="flex items-center gap-2">
  <div className="h-[7px] w-3.5 shrink-0 -skew-x-[18deg] bg-brand-orange" />
  <p className="text-[12.5px] text-muted-foreground">
    Eine spätere Deadline verschiebt alle folgenden Spieltage mit. So planst
    du Feiertage und Pausen ein.
  </p>
</div>
```

List container: `max-h-[40vh] overflow-y-auto rounded-lg border`. One row per
Spieltag:

```tsx
<div key={`${row.round}-${flashTick}`}
  className={cn("flex h-11 items-center gap-3 border-b border-border/60 px-3.5 last:border-b-0",
    flashing && "animate-[rowflash_0.9s_ease-out]")}>
  <span className="w-[82px] shrink-0 text-[13.5px] font-semibold">{matchdayName(row.round)}</span>
  <span className="w-[104px] shrink-0 text-[13px] text-muted-foreground">ab {fmtShort(row.start)}</span>
  <DatePicker value={row.end} disabledBefore={minFor(row)} formatStr="'bis' EEEEEE. dd.MM.yyyy"
    onChange={(date) => change(row.round - 1, date)} className="h-[30px] w-[172px] justify-between" />
  <div className="flex-1" />
  <span className={cn("text-[12.5px] font-medium tabular-nums",
    row.days > 7 ? "text-[oklch(0.55_0.13_50)]" : "text-muted-foreground")}>
    {row.days} Tage
  </span>
</div>
```

Cell specs:

- **ab-Datum** — derived week start, short weekday form `Mo. 03.07.`
  (`fmtShort`, no year — the picker carries the full date).
- **Deadline picker** — the existing `DatePicker`, with a new optional
  `formatStr` prop (default stays `"dd.MM.yyyy"`); the dialog passes
  `"'bis' EEEEEE. dd.MM.yyyy"` so the button reads **bis So. 12.07.2026**.
- **Dauer** — `row.days = daysBetween(row.start, row.end) + 1`. Neutral
  muted at the 7-day rhythm; **amber `oklch(0.55 0.13 50)` when longer** —
  a planned pause/holiday week is readable at a glance instead of requiring
  date math. (Same deliberate amber as the seeding caveats; still no warning
  token in DESIGN.md §1 — revisit if more warning states appear.)
- **Row 0 minimum**: `disabledBefore = addDays(seasonStart, 1)` — the action
  rejects `deadlines[0] <= seasonStart`; the picker should make that state
  unreachable instead of surfacing the server error. Later rows keep
  `disabledBefore = row.start`.

### Shift feedback

`change(index, date)` keeps calling `shiftDeadlineFrom`. When the delta ≠ 0,
every row **after** the edited one flashes once so the "shifts everything
after" rule is visible, not prose-only:

- Component state `flashFrom: number | null` + `flashTick: number`
  (incremented per change; part of the row `key`, so the animation
  retriggers on consecutive edits). Clear `flashFrom` after ~1s.
- Keyframes in `globals.css`:

```css
@keyframes rowflash {
  from { background-color: rgba(255, 123, 0, 0.14); }
  to { background-color: transparent; }
}
```

Rows are pure derivation (start/end/days from `seasonStart` + `deadlines` via
`windowsFromDeadlines`) — no new domain logic.

## 5. Post-creation (regular_season phase)

The "Einteilung & Spielplan" section keeps its place in the flow; the dialog
trigger gives way to a confirmation chip (same pattern as the seeding's
finalized chip):

```tsx
<div className="flex items-center gap-2 rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-3 py-1.5">
  <div className="h-2 w-4 -skew-x-[18deg] bg-brand-orange" />
  <span className="text-[13.5px] font-semibold">Spielplan erstellt — die Saison läuft</span>
</div>
```

The consequence line (§1) is dropped; the "Reguläre Saison" section and the
season card's "Reguläre Saison läuft" status render as already implemented.

## 6. Dark mode

- Facts strip, list, chips resolve via tokens (`bg-muted`, `border`,
  `text-muted-foreground`) — no explicit dark variants needed.
- Flash `rgba(255,123,0,0.14)` and the amber duration work on both modes
  (orange stays orange, per DESIGN.md).
- `DatePicker`/`Calendar` unchanged — existing components, existing tokens.

## 7. Checklist

1. `staff/page.tsx`: consequence line under the button row; extend
   `scheduleSetup` with `groups`/`matches` (§1)
2. `create-schedule-dialog.tsx`: `sm:max-w-[640px]`, shortened description,
   facts strip with live Saisonende (§2–3)
3. Spieltag list: hint row, weekday dates, duration column with amber
   pause signal, row-0 minimum, shift flash (§4)
4. `date-picker.tsx`: optional `formatStr` prop (§4)
5. `globals.css`: `rowflash` keyframes (§4)
6. Regular-season chip (§5)
7. Both modes verified (§6), `npx biome check --write .`,
   `npx tsc --noEmit`, `npm test -- --run`
