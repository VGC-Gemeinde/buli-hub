# Buli Hub — Staff-Bereich (design handoff, iteration 3)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still valid) and
`SIGNED-IN.md`. This doc is the design pass over the existing staff feature against
current `main` (d400315): user-menu entry, `/staff` layout, the three registration
states, the player grid, and the open-registration dialog. Domain logic
(`registration-window.ts`, queries, actions) is correct as-is; only views change,
plus one constant. Reference design: project file "Staff-Bereich.dc.html"
(1a entry, 2a–2d states — top section is the current iteration).

---

## 1. User menu → Staff-Bereich item (`user-menu.tsx`)

New `DropdownMenuItem` between **Profil** and **Abmelden**: Link to `/staff`,
`font-medium` like the Profil item.

- Item row: `flex items-center justify-between`; right-aligned decorative tick
  `<div className="h-[7px] w-3.5 -skew-x-[18deg] bg-brand-orange" />` — marks the
  privileged area. Drop it if it reads as noise in practice.
- Rendered only when `roleAtLeast(role, "staff")` (existing guard). No header link;
  non-staff users never see the entry.

## 2. `/staff` layout (`staff/page.tsx`)

- Widen the content column: `max-w-[960px]` (currently `max-w-xl`), `px-8 py-12`.
- `h1` **Staff-Bereich** — `text-4xl text-brand-blue dark:text-white`, `mb-9`.
- Sections stack with `gap-10`. Section headers use the signature pattern
  (tick + h2, per SIGNED-IN.md §3) **plus** `border-b pb-3.5` on the row:

```tsx
<div className="flex items-baseline justify-between border-b pb-3.5">
  <div className="flex items-center gap-2.5">
    <div className="h-[9px] w-[18px] -skew-x-[18deg] bg-brand-orange" />
    <h2 className="text-[26px] tracking-[0.03em]">Anmeldungen</h2>
  </div>
  <span className="text-muted-foreground text-sm">{players.length} gesamt</span>
</div>
```

Section names: **Saison** (always) and **Anmeldungen** (only in `open`/`closed` —
before the registration opens there are no registrations, so the section does not
exist at all).

## 3. Season card — three status variants (`registration-status.tsx`)

The page presents the **season**, not "the window". The system knows the next
season; staff never creates one — the only action is opening its registration.

Card: `rounded-lg border px-6 py-5`, vertical `gap-5` (not_started) / `gap-2`
(open, closed). Title row:

```tsx
<div className="flex items-center gap-3.5">
  <div className="font-heading font-bold text-2xl uppercase tracking-[0.02em] text-brand-blue dark:text-white">
    Saison 1
  </div>
  <div className="flex items-center gap-2">
    <div className={cn("h-2 w-4 -skew-x-[18deg]", state === "open" ? "bg-brand-orange" : "bg-border")} />
    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {statusLabel}
    </span>
  </div>
</div>
```

Status labels: `Anmeldung noch nicht geöffnet` / `Anmeldung offen` /
`Anmeldung geschlossen`. The tick is orange **only while open**, otherwise
`bg-border`. ("Saison 1" is a styled div, not a heading tag — h1–h3 auto-styling
doesn't apply, set font-heading/uppercase manually.)

### not_started (ref 2a)

Inside the card, below the title row:

1. Form row `flex items-end gap-3`: Label **Anmeldeschluss** +
   `<Input type="datetime-local" className="h-8 w-[200px]" />` + default Button
   **Anmeldung öffnen** → dialog (§5). Validate "date set + in future" on the page
   (error `text-destructive text-sm` under the field); the dialog never opens with
   an empty date.
2. Link block `flex flex-col gap-2`: `text-[13px] text-muted-foreground`
   **Anmeldelink (aktiv, sobald geöffnet):** + existing `CopyLinkButton` (unchanged).

No Anmeldungen section in this state.

### open (ref 2c)

1. Meta line under the title row: `text-muted-foreground text-sm`
   **Schließt automatisch am {closesAt}.** — keep the existing `de-DE`
   `dateStyle: "long"` + `timeStyle: "short"` format.
2. Link block: **Anmeldelink:** + `CopyLinkButton`, `mt-2`.
3. **No close action anywhere** — closing stays time-derived
   (`registrationState` unchanged).
4. Anmeldungen section (§4) appears after the card.

### closed (ref 2d)

- Meta line: **Geschlossen seit {closesAt}.**
- No link block — the link is dead after close.
- Anmeldungen section stays visible (final list).

## 4. Player grid (replaces `PlayerList`)

Registrations render as a dense chip grid, not a single-column list — goal is
maximum names per viewport.

- Sort by Discord username:
  `players.toSorted((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }))`
- Grid: `grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2`
- Chip:

```tsx
<div className="flex min-w-0 items-center gap-2 rounded-lg border py-1 pr-2.5 pl-1">
  <Avatar className="size-6">
    {player.avatarUrl ? <AvatarImage src={player.avatarUrl} alt="" /> : null}
    <AvatarFallback className="text-[10px] font-semibold">
      {player.name.slice(0, 2).toUpperCase()}
    </AvatarFallback>
  </Avatar>
  <span className="truncate text-sm font-medium">{player.name}</span>
</div>
```

- The count lives in the section header (§2), no separate "{n} angemeldete
  Spieler" line.
- Empty state (open, 0 registrations): keep the existing dashed box —
  `rounded-lg border border-dashed px-4 py-8 text-center text-muted-foreground text-sm`
  **Noch keine Anmeldungen.** — instead of the grid.
- `RegisteredPlayer` gains `avatarUrl?: string`.

## 5. Open-registration dialog (`open-registration-dialog.tsx`, `registration-window.ts`)

The **Enddatum field moves out of the dialog** onto the card form (§3). The dialog
is confirmation only; it receives `closesAt` for display and submit.

- `DialogTitle`: **Anmeldung öffnen?**
- `DialogDescription`: Die Anmeldung für **Saison 1** öffnet sofort und schließt
  automatisch am **{closesAt}**. — both bold spans `font-semibold text-foreground`.
  If opening later triggers a Discord announcement, state that here too.
- Type-to-confirm: Label **Gib "Saison 1" ein, um zu bestätigen** (phrase
  `font-semibold text-brand-blue dark:text-white`) + Input, `placeholder="Saison 1"`,
  `autoComplete="off"`.
- `OPEN_CONFIRMATION_PHRASE = "Saison 1"` — it names *what* is being opened
  instead of echoing the button label and can't be typed on autopilot.
  `matchesConfirmationPhrase` otherwise unchanged (trim, exact match).
- `DialogFooter`: outline Button **Abbrechen** (DialogClose) + default Button
  **Anmeldung öffnen**, disabled until the phrase matches; pending label
  **Wird geöffnet…** (existing behavior).

## 6. Checklist

1. `user-menu.tsx`: Staff-Bereich item behind the role guard (§1)
2. `staff/page.tsx`: widen layout, h1, section scaffolding (§2)
3. `registration-status.tsx`: season card with three status variants, link-block
   placement, chip grid + empty state (§3–4)
4. `open-registration-dialog.tsx` + `registration-window.ts`: date field to the
   page, confirm-only dialog, phrase → "Saison 1" (§5)
5. Verify both modes, `npx biome check --write .`, `npx tsc --noEmit`,
   `npm test -- --run`
