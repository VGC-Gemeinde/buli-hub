# Buli Hub — Spoiler-Schutz (design handoff)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still
valid). This doc is the design pass over the shipped **public spoiler
protection** (`docs/plans/public-spoiler-protection.md`) and its Match of the
Week touchpoints. Domain logic (`spoilers.ts`, `scoreHidden`, cookie
`spoilers_off`, MotW exemption) is correct as-is; **only views change**.
Reference design: project file **"Spoiler-Schutz (Ergebnisseite).dc.html"** —
interactive, two frames: **01 · Öffentliche Übersicht** (switch, row masks,
MotW billboard + row) and **02 · Ergebnisseite** (inline protection). Tweaks
on frame 02: Plattform (Showdown/Cartridge), MotW-Banner an/aus, Serie
(2:1 / 2:0). Every mask, link and the switch are clickable.

Design intent in one line: spoiler protection **melts into the normal
layout** — hidden values render as quiet placeholders in the element's own
typography and scale, nothing is a dark chip or a cover card, and revealing
never shifts a single pixel of layout.

This supersedes two earlier specs:

- `MATCH-OF-THE-WEEK.md` §3 (MotW row badge + row tint) — replaced by §2.3
  below: the orange cover pill **is** the badge; no row tint, no extra pill.
- `MATCH-OF-THE-WEEK.md` §4.2/4.3 (match-page cover card) — replaced by §3
  below: the full-page `SpoilerCoverShell` is retired; the page always
  renders its normal layout with masked slots.

---

## 1. The masking idiom (shared)

One idiom everywhere: a hidden value is drawn **in place**, at the size the
real value would occupy, as a neutral placeholder. Three shapes of it:

### 1.1 Placeholder pill (hidden text)

Replaces the shipped `SpoilerScore` dark chip (`bg-brand-blue/85 ••• `) —
delete that styling entirely.

```
rounded-full bg-[oklch(0.93_0.01_262)] hover:bg-[oklch(0.86_0.015_262)]
cursor-pointer  (button, no border, no padding — size set per context)
```

- Overview match rows: `w-10 h-3` (40×12).
- Match-page game rows ("Sieger: ▢"): `w-[88px] h-[13px]`, vertically
  centered next to the "Sieger:" label.
- Dark mode: `bg-white/12 hover:bg-white/20`.
- Always `title="Ergebnis verdeckt — antippen zum Aufdecken"` (game rows:
  "Sieger verdeckt — …") and `aria-label="Ergebnis aufdecken"`.
- Click is shielded as shipped (`preventDefault` + `stopPropagation`) — the
  surrounding row can stay a link.

### 1.2 Masked score (hidden numbers)

Numbers are masked with en-dashes **in the score's own type**, never with a
pill. Match-page scoreboard: `– : –` in `font-heading 56px` (colon 38px, as
the real score), color `oklch(0.82 0.015 263)`, hover `oklch(0.65 0.03 263)`,
the whole thing one button (same title/aria as §1.1). Mobile scoreboard rows
(`PlayerRow`): a single `–` replaces each 32px score numeral, same colors.

### 1.3 Reveal controls (text links, never buttons)

All explicit reveal/re-cover affordances are quiet text links: 13px,
`font-semibold text-brand-blue underline underline-offset-[3px]`, hover
`text-brand-orange`. Wording pairs: **Ergebnis aufdecken** ⇄
**Wieder verdecken**. (Exception: the MotW billboard keeps its own reveal
button per `MATCH-OF-THE-WEEK.md` §2.2 — the billboard is the one loud
element and stays as specced there.)

### 1.4 Zero-relayout rule

Every state swap happens inside a fixed-footprint slot. Concretely (all in
§2/§3): the overview score slot, the notice line, the scoreboard center box,
the reserved winner-marker rows, and the equal-height game rows. If a new
covered element is added later, reserve its revealed footprint the same way.

## 2. Public overview (`public-league.tsx`, `spoiler-switch.tsx`, `spoiler-score.tsx`)

### 2.1 Global switch

Placement: **title row, right-aligned**, after the "Spieltag {n} / 7" label
(`flex items-center gap-6`). Standard shadcn Switch, checked = protection
**on** (default), track `bg-brand-blue` when on. Label right of the track:
**Spoiler-Schutz**, 13.5px `font-semibold text-brand-blue`;
`title="Verdeckt fremde Ergebnisse auf der ganzen Seite"`. Cookie semantics
unchanged (`spoilers_off=1` ⇄ absence).

- Switching **off** reveals every masked row *except* the MotW row (§2.3).
- Switching back **on** re-covers everything and **clears all per-row
  reveals** — a fresh cover, no half-revealed leftovers.

### 2.2 Match rows

Row anatomy unchanged. The center score slot becomes a **fixed-width box**
(`w-12 flex items-center justify-center`) so pill ⇄ score ⇄ "offen" swap
without any horizontal shift. Three states:

1. **Unplayed**: "offen", 13px semibold muted (unchanged).
2. **Covered** (`scoreHidden` true): placeholder pill §1.1 (`w-10 h-3`).
   Tap reveals **only this row**, client-side.
3. **Visible** (own match, revealed, or switch off): score 13px semibold
   tabular-nums (unchanged).

Winner bolding stays **suppressed while covered** (both names
`font-medium`); it returns only in state 3 — exactly the shipped
`scoreHidden` wiring, only the chip visual changes.

### 2.3 MotW row — the cover is the badge

The featured match's cover pill is the **only** MotW marker in the list:

```
rounded-full bg-brand-orange hover:bg-[#ff8d24] text-white
px-[9px] py-1 text-[8.5px] font-bold uppercase tracking-[0.09em]
leading-none    label: MotW
```

- `title="Match of the Week — Ergebnis bleibt verdeckt, antippen zum
  Aufdecken"`.
- **Permanent**: ignores the global switch (as per domain rules); tap still
  reveals client-side (courtesy tag, not security).
- No row tint, no border change, no separate badge pill — the row is
  otherwise identical to its neighbors. Once revealed, it shows the plain
  score like any row (no bolding leak-guard needed post-reveal).
- Keep `motw-badge.tsx` for the banner and staff manager; it just no longer
  appears in match rows.

### 2.4 Billboard

Unchanged from `MATCH-OF-THE-WEEK.md` §2 (navy billboard, fixed 74px center
state box, permanent cover). Frame 01 includes it wired to the same data as
the row so the two never disagree.

## 3. Match page — inline protection (`app/match/[matchId]/page.tsx`, `report-summary.tsx`)

**`SpoilerCoverShell` is retired.** Neutral viewers with protection on (and
all neutral viewers on a MotW match) get the **normal result page layout**
with masked slots — so replays, teamsheets and the match video are usable
without being spoiled. Participants and staff see everything as today.
`getMatchResult` already ships full data to the client; reveal is a courtesy
tag, not security (unchanged trade-off, see plan doc).

Page order and chrome unchanged: `SiteHeader` breadcrumb → back link →
(MotW banner) → eyebrow + status chip → `h1` → scoreboard → meta line →
Spiele → Teamsheets.

### 3.1 Eyebrow + status chip

Unchanged: "Ergebnis · Spieltag {n} · {group} · {season}" + **Final** chip.
Both are safe — they say *that* a result exists, never *what* it is.

### 3.2 Headline — swaps in place

- **Covered**: the pairing — **{A} vs. {B}**, the "vs." in
  `oklch(0.68 0.025 263)`; same `h1` metrics as the result headline
  (`font-heading 38px leading-[1.1]`), so the swap costs zero height.
- **Revealed**: **Sieg für {B}** / **Doppelniederlage** as shipped.
- Free win: covered shows the same pairing headline (never "Freewin für X");
  revealed shows the shipped free-win view.

### 3.3 Notice line (replaces the cover card)

One quiet line between `h1` and scoreboard — `flex items-baseline gap-2.5
text-[13px] text-muted-foreground min-h-5` — copy + reveal link (§1.3):

- Covered, default: "Spoiler-Schutz aktiv — Sieger und Endstand sind
  verdeckt." + **Ergebnis aufdecken**
- Covered, MotW: "Match of the Week — Ergebnis verdeckt, erst das VOD
  ansehen." + **Ergebnis aufdecken**
- Revealed (both): "Ergebnis aufgedeckt — nur für dich, hier auf dieser
  Seite." + **Wieder verdecken**

All three are one line at 760px content width — keep them short so the line
never wraps (that was a measured 7px relayout bug in an earlier iteration).
The link reveals/re-covers the **whole page** (headline, score, all games);
re-covering also resets per-game reveals.

### 3.4 Scoreboard

Desktop `ScoreBoard` anatomy unchanged, three additions:

- Center column becomes a **fixed slot**: `h-14 w-32 flex items-center
  justify-center`. Covered: the `– : –` button (§1.2). Revealed: the real
  score; the **loser's numeral** in muted (`text-muted-foreground`), winner's
  in `text-brand-blue` — matches the shipped mobile treatment.
- **Reserve the winner-marker row on both sides**: a `h-[15px]` sub-row under
  each name, empty while covered, holding the orange "Sieger" marker after
  reveal. Names never move.
- Winner marker only after reveal; no "Du"/"Gegner" sub-labels for neutral
  viewers (as shipped).

Mobile `PlayerRow`s: score numeral masked per §1.2, winner marker suppressed
while covered; row heights are already fixed by the avatar.

### 3.5 Spiele — replays stay free

Game rows keep their shipped anatomy (label · winner · replay button). The
middle gets `min-h-[31px]` so all rows are equal height with or without a
replay button. Per row:

- "Sieger:" label muted while covered, `text-brand-blue` after.
- Winner name masked with the pill §1.1 (`w-[88px] h-[13px]`); **each game
  reveals independently** (tap = just that game) — you can watch replay 1,
  peek game 1, and stay unspoiled for the series.
- **Replay ansehen ↗** buttons always visible and always live.
- Section header, right-aligned while covered: "Replays spoilerfrei ansehen"
  (12.5px muted) — disappears after full reveal (baseline row, no shift).

### 3.6 Fixed game count — the row count must not leak

A Bo3 that ended 2:0 must not betray itself by showing two rows. While
covered, **always render 3 rows**:

- **Showdown**: the phantom third row is a normal covered row whose replay
  button links a **dummy replay** (reuse game 2's URL). On reveal it becomes
  the **ghost variant**: `border-dashed border-[oklch(0.87_0.015_262)]
  bg-muted/30`, label muted, copy "Nicht gespielt — die Serie war nach zwei
  Spielen entschieden.", no replay button, same `min-h` so nothing shifts.
- **Cartridge**: same 3-rows + ghost rule, just without replay buttons
  anywhere (per shipped platform rules); the match video in §3.7 is the
  spoiler-free content there.
- A real 2:1 needs no phantom; per-game reveal of the phantom row is allowed
  (revealing it *is* revealing the score shape — acceptable, user-initiated).

### 3.7 Teamsheets & video — never spoilers

Untouched and always free: both pokepaste cards, and (Cartridge only)
**Video zum Match**. Showdown results never show a video card (two distinct
result-page variants, per shipped reporting rules).

### 3.8 MotW variant

Banner per `MATCH-OF-THE-WEEK.md` §4.1, unchanged, above everything. The
cover card of §4.2 is gone — the MotW match uses this exact inline layout
with the MotW notice copy (§3.3) and **ignores the global switch** (protected
even for visitors who turned protection off; `motw-spoiler.tsx` becomes a
thin wrapper choosing the notice copy, or is folded into the page).

## 4. Behavior rules (unchanged domain, restated)

- `scoreHidden({reported, isMine, spoilersOff})` decides masking — no new
  logic, only new visuals.
- All reveals are client-side `useState`, per page load, never persisted.
- Pending free wins stay invisible to neutral viewers (page shows the open
  state) — nothing to mask.
- Disputes: neutral viewers never see the dispute banner/chip (shipped rule);
  the **Final** chip is safe to show while covered.
- Spieler-Dashboard and staff area remain out of scope (own results are
  never masked).

## 5. Copy reference

| Context | String |
|---|---|
| Switch label | Spoiler-Schutz |
| Switch tooltip | Verdeckt fremde Ergebnisse auf der ganzen Seite |
| Pill tooltip (row/score) | Ergebnis verdeckt — antippen zum Aufdecken |
| Pill tooltip (game) | Sieger verdeckt — antippen zum Aufdecken |
| Pill tooltip (MotW row) | Match of the Week — Ergebnis bleibt verdeckt, antippen zum Aufdecken |
| Notice, covered | Spoiler-Schutz aktiv — Sieger und Endstand sind verdeckt. |
| Notice, covered (MotW) | Match of the Week — Ergebnis verdeckt, erst das VOD ansehen. |
| Notice, revealed | Ergebnis aufgedeckt — nur für dich, hier auf dieser Seite. |
| Reveal / re-cover links | Ergebnis aufdecken / Wieder verdecken |
| Games hint, covered | Replays spoilerfrei ansehen |
| Ghost row | Nicht gespielt — die Serie war nach zwei Spielen entschieden. |

## 6. Checklist

1. `spoiler-score.tsx`: dark chip → placeholder pill (§1.1), sizes per
   context, tooltips, dark-mode fills
2. `spoiler-switch.tsx`: title-row placement, label styling, re-cover clears
   per-row reveals (§2.1)
3. `public-league.tsx` MatchRow: fixed `w-12` score slot, pill/"offen"/score
   states, suppressed bolding, orange **MotW** cover pill replaces the row
   badge (§2.2–2.3)
4. `app/match/[matchId]/page.tsx`: drop `SpoilerCoverShell` usage; always
   render the summary, pass a `covered` mode for neutral viewers (general +
   MotW paths) (§3)
5. `report-summary.tsx`: covered mode — pairing headline, notice line,
   masked scoreboard with reserved marker rows, per-game pills, phantom
   third row + ghost variant, mobile masking (§3.2–3.6)
6. Delete `spoiler-cover-shell.tsx` once both call sites are migrated;
   slim `motw-spoiler.tsx` to the copy-variant wrapper (§3.8)
7. `/dev/ui` gallery: pill (covered/hover/revealed), switch, match row
   states (offen / covered / revealed / MotW covered), full match page
   covered ⇄ revealed (Showdown 2:1, Showdown 2:0 with ghost row,
   Cartridge), MotW match page
8. Reveal/re-cover must not move layout — compare `getBoundingClientRect`
   of scoreboard + sections across the toggle in both viewports
9. Verify both modes, `npx biome check --write .`, `npx tsc --noEmit`,
   `npm test -- --run`
