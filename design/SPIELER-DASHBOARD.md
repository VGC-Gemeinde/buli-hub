# Buli Hub — Spieler-Dashboard (design handoff)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still valid),
`STAFF-BEREICH.md` and `SPIELPLAN-ERSTELLUNG.md`. This doc is the design pass
over the player season dashboard against current `main`: the `/spieler`
in-season view (`InSeasonDashboard`), its shell, and the header navigation.
Domain logic (`dashboard.ts`, `queries.ts`, `currentMatchday` /
`classifyMatch` / `opponentOf`) is correct as-is; **only views change**.
Reference design: project file **"Spieler-Dashboard.dc.html"** (interactive —
current round, deadline countdown, overdue state and not-placed state are
tweakable).

The core idea: the page answers one question first — **wen spiele ich diese
Woche, und bis wann?** — as a hero card, with the season context (progress,
full personal schedule, standings) readable below without competing. The hero
carries the single primary action slot where „Ergebnis melden" attaches.

Two phases share the layout. **v1 (pre-reporting)** ships without results:
schedule rows show week dates, the table is all-zero. The result cells, the
Überfällig state and live standings (§5–6, marked *mit Reporting*) activate
with the reporting feature — no layout change, cells fill in.

---

## 1. Header navigation (`site-header.tsx`)

Primary nav link for **every signed-in user** (unlike the gated
Staff-Bereich menu item), left cluster next to the wordmark, `gap-7` from it:

```tsx
<Link href="/spieler" className="flex items-center gap-2">
  <div className="h-2 w-4 -skew-x-[18deg] bg-brand-orange" />
  <span className="text-sm font-semibold text-brand-blue dark:text-white">Spieler-Dashboard</span>
</Link>
```

The tick doubles as the active-state marker; if more nav links arrive later,
only the active link carries it (inactive: `text-muted-foreground`, no tick).

## 2. Shell (`spieler/page.tsx`)

- Widen: `max-w-[1040px] px-8 pt-11 pb-18` (currently `max-w-2xl`) — the
  two-column body (§5–6) needs the room. Pre-season states keep rendering in
  the same shell, unchanged.
- The in-season view replaces the static `h1` with a title row:

```tsx
<div className="flex flex-wrap items-baseline justify-between gap-4">
  <h1 className="text-[38px] leading-[1.1] text-brand-blue dark:text-white">Deine Saison</h1>
  <div className="flex items-center gap-2.5">
    <div className="h-[9px] w-[18px] -skew-x-[18deg] bg-brand-orange" />
    <span className="font-heading text-xl font-bold uppercase tracking-[0.04em] text-brand-blue dark:text-white">
      {groupName}
    </span>
    <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">· {SEASON_NAME}</span>
  </div>
</div>
```

„Deine Saison" (not „Spieler-Dashboard") — the nav already says where you
are; the page says what it is. The non-placed / pre-season states keep the
plain **Spieler-Dashboard** h1.

## 3. Season progress strip

Directly under the title row (`mt-4.5 mb-8`), one segment per Spieltag:

```tsx
<div className="flex items-center gap-3.5">
  <div className="flex flex-1 gap-[5px]">
    {rounds.map((r) => (
      <div key={r} className={cn("h-1.5 flex-1 rounded-[3px]",
        r < current ? "bg-[oklch(0.82_0.045_263)]" : r === current ? "bg-brand-orange" : "bg-[oklch(0.94_0.008_262)]")} />
    ))}
  </div>
  <span className="whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
    Spieltag {current} von {total}
  </span>
</div>
```

Past = navy tint, current = orange, upcoming = neutral. Dark mode: swap the
two neutrals for their dark-token equivalents (`bg-muted` variants), orange
stays orange.

## 4. Hero — next pairing

Card `rounded-lg border px-[30px] py-[26px]`, `flex items-center
justify-between gap-6 flex-wrap`. Left column (`gap-4.5`):

1. Label row: tick `h-2 w-4 -skew-x-[18deg] bg-brand-orange` +
   `text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground`
   **Nächstes Match · Spieltag {n}**.
2. Matchup row (`flex items-center gap-4.5`):
   - Me: `Avatar size-[46px]` — filled `bg-brand-blue text-white` — + column:
     name `font-heading text-[28px] font-bold uppercase leading-[1.05]
     text-brand-blue dark:text-white` over `text-xs font-semibold uppercase
     tracking-[0.12em] text-muted-foreground` **Du**.
   - `<span className="-skew-x-[10deg] px-1 font-heading text-xl font-bold text-brand-orange">VS</span>`
   - Opponent: neutral avatar (`bg-muted`, initials fallback) + name, same
     heading style.
3. Meta block, right of the matchup group (`flex items-center gap-7`), left-aligned
   internally (`items-start` — its ragged edge faces the button, the card
   edge belongs to the button):
   - `text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground` **Deadline**
   - `font-heading text-2xl font-bold uppercase text-brand-blue dark:text-white` {fmt deadline, `So., 19. Juli`}
   - Countdown chip `rounded-full px-3 py-1 text-[13px] font-semibold`:
     `bg-brand-orange/12 text-brand-blue` normally, **solid `bg-brand-orange`
     when ≤ 2 days remain**. Label: `Noch {n} Tage` / `Noch 1 Tag` /
     `Heute fällig`.
4. Far right: `<Button size="lg">Ergebnis melden</Button>` — the page's only
   solid-orange element; **ships with reporting**, the slot is reserved now.
   Post-report states (waiting for confirmation, final score) swap into this
   slot later.

### Bye variant

Same card. Label **Spieltag {n}**, heading `font-heading text-[32px]`
**Spielfrei**, subline `text-sm text-muted-foreground` „Diese Woche hast du
kein Match — Zeit zum Vorbereiten." Right block: **Danach** label + „Spieltag
{r} · vs. {name}" + `Deadline {date}`. No button.

## 5. Dein Spielplan (left column)

Body grid: `grid grid-cols-[1.25fr_1fr] gap-7 mt-10 items-start`
(single column below `lg`). Section header = signature pattern (tick + h2
`text-2xl`, `border-b pb-3`), right meta `{total} Spieltage`.

Rows (`flex flex-col gap-2`), one per Spieltag, `flex h-[54px] items-center
gap-3.5 rounded-lg border py-2.5 pr-4 pl-2.5`:

- **Round chip** `size-[34px] rounded-lg bg-muted font-heading text-[17px]
  font-bold text-muted-foreground` — current week: `bg-brand-orange
  text-brand-blue`.
- **Opponent** avatar `size-7` + `text-[15px] font-semibold truncate`. Bye
  rows: dashed empty circle (`border border-dashed`) + `Spielfrei`
  `font-medium text-muted-foreground`.
- **Right cluster** (`flex items-center gap-3`), per state:
  - upcoming: week range `text-[13px] text-muted-foreground` (`13.–19. Juli`)
  - current: `text-xs font-semibold uppercase tracking-[0.1em]
    text-brand-orange` **Diese Woche** + week range; row gets
    `border-brand-orange/45 bg-brand-orange/5`
  - played *(mit Reporting)*: outcome chip **then** score, so the scores
    right-align down the column — chip `rounded-full px-2.5 py-[3px] text-xs
    font-semibold`, **Sieg** `bg-brand-orange/12 text-brand-blue`,
    **Niederlage** `bg-muted text-muted-foreground`; score
    `min-w-[34px] text-right font-heading text-[19px] font-bold
    tracking-[0.04em] text-brand-blue dark:text-white` (`2 : 1`)
  - past bye / past without result (v1): row at `opacity-55`, week range only
  - **überfällig** *(mit Reporting)* — past round, no result: row
    `border-destructive/35 bg-destructive/5`, chip **Überfällig**
    `bg-destructive/10 text-destructive`, week range stays. Full opacity —
    it needs attention, it must not fade.

## 6. Tabelle (right column)

Section header: tick + **Tabelle**, right meta `{groupName}`. Container
`rounded-lg border overflow-hidden`; header row `grid
grid-cols-[48px_1fr_60px_64px] bg-muted/50 px-4 py-2.5 border-b` with
`text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground`
labels **Platz · Spieler · Bilanz · Punkte** (last two right-aligned).

Player rows, same grid, `px-4 py-2.25 border-b last:border-b-0`:

- Platz `text-sm font-semibold text-muted-foreground`; Spieler = avatar
  `size-[26px]` + name `text-[14.5px] font-medium truncate`; Bilanz
  `text-right text-sm text-muted-foreground` (`2 : 0`); Punkte
  `text-right text-[14.5px] font-semibold`.
- **Own row**: `bg-brand-orange/6`, name `font-semibold`, avatar filled
  `bg-brand-blue text-white`, plus tag `text-[10px] font-bold uppercase
  tracking-[0.1em] text-brand-orange` **Du** after the name.
- **v1 (pre-reporting)**: all rows `0 : 0` / `0`, Platz **–** (em dash — no
  fake ranking), ordered by name. No explanatory caption — the zeros are
  self-evident.
- **Mit Reporting**: Bilanz = W : L, Punkte = 3 · W (unreported/überfällige
  matches count for nobody). Sort: `pts desc, losses asc, name asc
  (localeCompare de)` — equal points with fewer losses ranks higher. Platz =
  position 1…n.

## 7. Not-placed state

Keeps the plain h1 (§2). Panel `rounded-lg border px-8 py-7 flex flex-col
gap-2.5 items-start`: tick + `font-heading text-[22px] font-bold uppercase
text-brand-blue dark:text-white` **Du bist in der laufenden Saison nicht
dabei** over `text-[15px] text-muted-foreground` „Für diese Saison liegt
keine Einteilung für dich vor. Die nächste Anmeldung wird im Discord
angekündigt." All other pre-season states stay as implemented.

## 8. Dark mode

- Everything resolves via tokens (`border`, `bg-muted`,
  `text-muted-foreground`, `text-brand-blue dark:text-white`); orange tints
  (`/5`, `/12`) work on both modes — orange stays orange, per DESIGN.md.
- Überfällig uses the `destructive` token pair — no raw red values.
- Progress strip past/upcoming neutrals: use muted-token variants in dark.

## 9. Checklist

1. `site-header.tsx`: Spieler-Dashboard nav link with tick (§1)
2. `spieler/page.tsx`: widen shell; in-season title row „Deine Saison" +
   group badge (§2)
3. `season-dashboard.tsx`: progress strip (§3), hero card with meta block +
   reserved action slot (§4), schedule rows (§5), table (§6)
4. Not-placed panel (§7)
5. Reporting follow-up wiring: result cells, Überfällig, live standings +
   sort, „Ergebnis melden" button (§4–6, *mit Reporting*)
6. Both modes verified (§8), `npx biome check --write .`,
   `npx tsc --noEmit`, `npm test -- --run`
