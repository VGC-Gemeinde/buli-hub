# Buli Hub — Match of the Week (design handoff)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still
valid). This doc is the design pass over the shipped **Match of the Week**
feature (`docs/plans/match-of-the-week.md`). Domain logic (`motw.ts`, queries,
actions, round gating, spoiler semantics) is correct as-is; only views change.
Reference design: project file **"Match of the Week.dc.html"** — interactive;
use the spec switchers above frame 01 (Offen / Gemeldet · verdeckt /
Aufgedeckt, VOD an/aus) and frame 04 (Warnung / Dringend) to see all states.
Spoiler-reveal, staff picking, filters and remove/replace are clickable.

Design intent in one line: the MotW is the league's **one editorial moment**
per week — it gets a broadcast-style billboard, everything else in the feature
stays quiet, spoiler-safe utility.

---

## 1. Shared pieces

### 1.1 MotW badge (`motw-badge.tsx`)

One pill, used in match rows, the match-page banner and the staff manager:

```
inline-flex items-center gap-1.5 rounded-full
border border-brand-orange/50 bg-brand-orange/12
px-2.5 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.08em]
```

- Leading element: skewed tick `h-1.5 w-3 -skew-x-[18deg] bg-brand-orange`.
- Text color `#9a4b00` (readable orange-brown on the tinted fill; in dark mode
  use `text-brand-orange`). Label **MOTW** in compact contexts (match rows),
  **Match of the Week** where space allows (banner) — the .dc.html has a
  `badgeStil` tweak comparing both; compact is the default.
- Always carries `title="Ergebnis verdeckt — Match of the Week"` when it
  replaces a score.

### 1.2 Buttons on orange

Primary/orange buttons are **white text** (`text-white`), per production.
This applies to every YouTube CTA, VOD **Speichern**, and the urgent todo's
**Jetzt wählen** below.

## 2. Public overview — the billboard (`motw-block.tsx`)

Replaces the tinted-card block with a **dark navy billboard**, the only dark
panel on the page. Placement unchanged: directly under the title row, **above
the division switcher**, only while its round is the current Spieltag.

Container: `relative overflow-hidden rounded-xl bg-brand-blue text-white`,
with the two signature elements inside:

- 3px `bg-brand-orange` strip flush at the top of the card.
- Logo watermark: `absolute -right-[70px] -bottom-[60px] w-[320px]
  rotate-[-10deg] opacity-[0.08] rounded-[36px] pointer-events-none`.

Content column `gap-6 px-8 py-6` (26/32/24 in the reference), three rows:

### 2.1 Header row

- Orange tick (`h-2.5 w-5 -skew-x-[18deg] bg-brand-orange`) + heading
  **Match of the Week** — `font-heading 25px uppercase tracking-[0.04em]
  text-white` (never translated).
- Eyebrow beside it, baseline-aligned: **Spieltag {n} · {groupName}** —
  12px semibold uppercase `tracking-[0.14em] text-white/60`. No season label
  (the page title row already carries it).

### 2.2 Matchup row — `grid grid-cols-[1fr_auto_1fr] items-center gap-6`

- **Player side**: avatar `size-[50px]` (fallback: `bg-white/10 border
  border-white/22`), then a column: name in `font-heading 32px uppercase
  leading-[1.02] text-white` + sub-line **Platz {rank}** (the player's
  current standing) 12px `font-medium text-white/55`. Right side mirrored
  (right-aligned, avatar outside).
- **Center state box** — fixed footprint so state changes never relayout the
  card: `flex h-[74px] min-w-[190px] flex-col items-center justify-center
  gap-[7px]`. Three states:
  1. **Unplayed** (`!match.reported`): pill **Läuft diese Woche**
     (`rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-[12px]
     font-semibold uppercase tracking-[0.1em]`) + caption **Best of 3**
     (11.5px `text-white/55`).
  2. **Reported, covered** (default): reveal button — `rounded-[10px]
     bg-white/8 border border-brand-orange/65 px-5 py-[11px] text-sm
     font-semibold text-white` with a leading eye icon (16px, orange stroke),
     label **Ergebnis aufdecken**; hover `bg-brand-orange/18`. Caption:
     **Spoiler-Schutz — erst das VOD ansehen**.
  3. **Revealed** (client-side `useState`, as shipped): score
     `font-heading 46px tabular-nums` **2 : 1** + caption
     **Best of 3 · gemeldet**.
- Captions live inside the fixed box; the reveal button sits exactly where
  the score appears.

### 2.3 Footer row — `flex items-center gap-3.5`

- **VOD present**: primary button `bg-brand-orange text-white rounded-lg
  px-[18px] py-[9px] text-sm font-semibold` with a filled play triangle
  (14px), label **Auf YouTube ansehen**; hover a step lighter (`#ff8d24`).
- **VOD missing**: ghost placeholder in the *same footprint* — `border
  border-dashed border-white/35 text-white/55 rounded-lg px-[18px] py-2
  text-sm font-medium`, muted play icon, label **VOD folgt** (no timing
  claim). The slot never collapses; when the link lands, only the fill
  changes.
- Right, `ml-auto`: **Zum Match →** link, 13.5px `text-white/70`,
  hover `text-white`.

## 3. Match rows — badge instead of score (`public-league.tsx`)

In the Spielplan list (current *and* past rounds, permanently):

- The MotW row keeps the standard row anatomy but swaps the center score for
  the **MOTW badge** (§1.1) and gets a quiet highlight: `border
  border-brand-orange/50 bg-brand-orange/[0.045]` instead of the default
  border.
- **Both names stay `font-medium`** — winner bolding would leak the result.
  (Ordinary reported rows keep bolding the winner as shipped.)
- No other change; unplayed and reported rows around it are untouched.

## 4. Match page (`motw-match-banner.tsx`, `motw-spoiler.tsx`)

Order on `/match/[matchId]` stays as shipped: banner first, then spoiler or
summary. Neutral viewers only — participants and staff see everything as
today.

### 4.1 Banner — every viewer

`rounded-xl border border-brand-orange/40 bg-brand-orange/5 px-4 py-3`,
`flex flex-wrap items-center gap-x-3.5 gap-y-2.5`:

- MOTW badge (§1.1) + **Spieltag {n}** (12px semibold uppercase
  tracking-[0.08em] muted).
- `ml-auto`: YouTube button (orange, white text, play icon, `size sm`) once
  the link exists; nothing otherwise (the page has no stable slot to hold —
  the billboard carries the placeholder).

### 4.2 Spoiler cover

Layout as shipped (back link → kicker → pairing `h1`), cover card restyled to
match the banner family: `rounded-xl border border-brand-orange/40
bg-brand-orange/5 px-6 py-5`, `flex flex-col items-start gap-3`:

- **Ergebnis versteckt** — 14px semibold.
- Copy, 14px muted: „Dieses Match ist das Match of the Week — das Ergebnis
  bleibt verdeckt, damit dir das Video nicht gespoilert wird."
- Outline button `border-brand-orange/50` **Ergebnis anzeigen**.

### 4.3 Revealed state

Renders the normal neutral `ReportSummary` (no changes there), plus one
addition: a **Wieder verdecken** text link (12.5px muted, underlined),
right-aligned on the kicker row (`ml-auto`), which flips the spoiler state
back. Reveal state stays client-only — a courtesy tag, not security.

## 5. Staff — `/staff/motw` manager (`motw-manager.tsx`)

Header: standard `SiteHeader` breadcrumb **Staff-Bereich / Match of the
Week**. Page head: back link **← Staff-Bereich**, orange tick + `h1`
**Match of the Week** (30px), intro line 14px muted: „Ein Match pro Spieltag,
ligaweit über alle Divisionen. Die Auswahl gilt für den aktuellen und den
nächsten Spieltag."

### 5.1 Week cards — `grid gap-5 lg:grid-cols-2 items-start`

Card `rounded-xl border px-5 py-5 flex flex-col gap-4`:

- **Head**: `h2` **Spieltag {n}** (21px) + status chip — current week
  `bg-brand-orange/12 border-brand-orange/50 text-[#9a4b00]`
  **Aktuelle Woche**, next week neutral (`bg-muted border text-muted-
  foreground`) **Nächste Woche** — 11px bold uppercase pill; dates
  right-aligned, 13px muted tabular.
- **Selected pick box** (when a selection exists): `rounded-[10px] border
  border-brand-orange/40 bg-brand-orange/5 px-4 py-3.5` — badge-style pill
  reading **Gewählt** (§1.1 anatomy), pairing 15px semibold with muted
  „vs." and `· Div {group}`, then actions: outline **Anderes Match wählen**
  (toggles the picker; label flips to **Auswahl schließen**) and outline
  **Entfernen** in destructive text.
- **No pick**: one muted line „Für diesen Spieltag ist noch kein Match of the
  Week gewählt." — the picker list is open by default.

### 5.2 Picker list (open while picking or unpicked)

**New vs shipped: a division filter row** above the list — chips `rounded-full
px-3 py-1 text-[12.5px]` (**Alle · Div. 1 · Div. 2a · …**), active chip
`bg-brand-blue text-white`. With 14 groups the flat list is unusable without
it; derive the chip set from the round's matches.

Rows `flex items-center gap-3 rounded-lg border px-3 py-2 max-h-[300px]
overflow-y-auto` (list scrolls, card doesn't grow): group label (11px
semibold uppercase muted, fixed width), pairing (13.5px, muted „vs."),
trailing **Wählen** button (outline sm). The currently selected row's button
becomes **✓ Gewählt** — `border-brand-orange/55 bg-brand-orange/12
text-[#9a4b00]`, non-interactive.

### 5.3 VOD field (selected weeks + past picks)

Label **YouTube-VOD** (13px), input + primary **Speichern** (orange, white
text). Hint line 12px muted: with link „Link gesetzt — Feld leeren und
speichern entfernt ihn.", without „Noch kein VOD verlinkt." — never promise
upload timing (VODs usually land during the Spieltag, but not guaranteed).

### 5.4 Frühere Spieltage

Section header **Frühere Spieltage** + meta „VOD-Links nachträglich
anhängen". One row per past pick (`rounded-[10px] border px-4 py-3`):
round label · pairing · then either

- **link chip** — `rounded-full border bg-muted px-3 py-1 text-[12.5px]` with
  a small orange play icon and the shortened URL (`youtu.be/xK92dQ…`) +
  outline **Ändern** button (swaps to the inline input), or
- **inline input + Speichern** when no link yet; that row is flagged
  `border-brand-orange/45 bg-brand-orange/[0.04]` — the open task is visible
  at a glance.

Past picks themselves stay immutable (VOD only), as in the domain rules.

## 6. Staff dashboard — todo + entry point (`motw-todo-card.tsx`, `staff/page.tsx`)

Placement as shipped: `SeasonStrip` → todo card → `SaisonDashboard`, gap-4.5.

- **SeasonStrip**: keeps the permanent **Match of the Week** outline button
  (entry point once the todo is gone) — no visual change.
- **Warning** (next round unpicked): `rounded-lg border border-brand-
  orange/40 bg-brand-orange/5 px-5 py-4`, title 14.5px semibold **Match of
  the Week für Spieltag {n} wählen**, sub 13px muted „Der nächste Spieltag
  hat noch kein Match of the Week.", trailing outline button
  `border-brand-orange/50` **Jetzt wählen** → `/staff/motw`.
- **Urgent** (current round unpicked, replaces the warning):
  `border-destructive/45 bg-destructive/5`, title in `text-destructive`,
  sub „Der aktuelle Spieltag läuft noch ohne Match of the Week.", button
  primary (orange, **white text**) **Jetzt wählen**.
- Purely informational — never blocks pairings or anything else (unchanged).

## 7. Checklist

1. `motw-badge.tsx`: pill per §1.1 (tick, tint, `#9a4b00`, tooltip)
2. `motw-block.tsx`: navy billboard — top strip, watermark, header row,
   matchup grid with Platz sub-lines, fixed-footprint center state box,
   footer with YouTube button / dashed **VOD folgt** placeholder (§2)
3. `public-league.tsx` MatchRow: orange border + tint on MotW rows, no
   winner bolding there (§3)
4. `motw-match-banner.tsx` / `motw-spoiler.tsx`: banner + cover styling,
   **Wieder verdecken** link on the revealed summary (§4)
5. `motw-manager.tsx`: week-card head chips, selected pick box, division
   filter chips, scrolling picker, ✓ Gewählt state, VOD hints, past-pick
   link chips + missing-VOD row tint (§5)
6. `motw-todo-card.tsx`: variants per §6; orange buttons white text
   throughout (§1.2)
7. `/dev/ui` gallery: billboard (unplayed / covered / revealed ×
   with/without VOD), MotW match row, banner, spoiler cover, manager week
   card (picked / unpicked), past row (with/without link), todo both
   urgencies
8. Verify both modes, `npx biome check --write .`, `npx tsc --noEmit`,
   `npm test -- --run`
