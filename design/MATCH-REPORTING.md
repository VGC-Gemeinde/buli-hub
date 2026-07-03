# Buli Hub — Match-Meldung & Ergebnis (design handoff)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still valid),
`SPIELER-DASHBOARD.md` and `STAFF-BEREICH.md`. This doc is the design pass over
the player-side reporting feature against current `main`: the `/match/[matchId]`
report form, the free-win path and the read-only result summary. Domain logic
(`report.ts`, `standings.ts`, `match-state.ts`, queries, action) is correct
as-is; **only views change** — plus one input-shape note in §4. Reference
design: project file **"Ergebnis melden.dc.html"** (interactive — fill the form
and submit to reach the result screen; tweaks jump between the four views,
prefill a 2:1 and rename the opponent).

The core idea: players think **„ich habe 2:1 gewonnen"**, not „Spiel 1: Sieg,
Spiel 2: Niederlage". The form is built around a live scoreboard that fills in
as games are picked, winners are chosen **by tapping a player's name** (no
reporter-relative Sieg/Niederlage ambiguity), and a sticky submit bar replaces
the mystery-disabled button: it lists exactly what is still missing, and once
complete it reads back what is about to be reported — plus the warning that the
result is final. The free win is demoted from a top-of-form switch to an
escape-hatch link: it is the rare path and must not compete with the normal one.

---

## 1. Shell & header (`match/[matchId]/page.tsx`, `site-header.tsx`)

- Content column: `max-w-[760px] px-8 pt-9` — single column, narrower than the
  dashboard; a form wants one reading line. Bottom padding `pb-[140px]` so the
  sticky bar (§7) never covers the last section.
- Header nav becomes a breadcrumb on this page: the Spieler-Dashboard link
  (tick + label per SPIELER-DASHBOARD.md §1, but `text-muted-foreground
  font-medium hover:text-brand-blue`) + `<span className="text-[13px]
  text-border">/</span>` + current page `text-sm font-semibold text-brand-blue
  dark:text-white` — **Ergebnis melden** / **Freigewinn melden** / **Ergebnis**
  / **Freigewinn** depending on view.
- Above the page title: back link `← Zurück zur Übersicht`
  (`text-[13px] font-medium text-muted-foreground hover:text-brand-blue`,
  `mb-4.5`) → `/spieler`.

## 2. Page header

1. Eyebrow: tick `h-2 w-4 -skew-x-[18deg] bg-brand-orange` + `text-xs
   font-semibold uppercase tracking-[0.14em] text-muted-foreground
   whitespace-nowrap` — **Spieltag {n} · {groupName} · Deadline {date}**.
   Everything the player needs to confirm „richtiges Match" without leaving
   the page.
2. `h1 text-[38px] leading-[1.1] text-brand-blue dark:text-white` —
   **Ergebnis melden**, `mb-6.5`.

## 3. Live scoreboard

Card `rounded-xl border bg-[oklch(0.985_0.004_262)] dark:bg-muted/30
px-[30px] py-[22px]`, `grid grid-cols-[1fr_auto_1fr] items-center gap-4.5`:

- **Left — reporter**: filled avatar `size-[46px] bg-brand-blue text-white` +
  column: name `font-heading text-[26px] font-bold uppercase leading-[1.05]
  text-brand-blue dark:text-white` over `text-[11px] font-semibold uppercase
  tracking-[0.12em] text-muted-foreground` **Du**.
- **Center**: the live score — `font-heading text-[46px] font-bold
  text-brand-blue dark:text-white`, divider `:` in `text-[32px]
  text-border`. Shows **– : –** until the first game is picked, then counts
  the picked wins per side. Beneath it:
  - series open: `text-xs font-medium text-muted-foreground` **Best of 3**
  - series decided: chip `rounded-full bg-brand-orange/14 px-3 py-[3px]
    text-xs font-semibold text-brand-blue whitespace-nowrap` —
    **Sieg für dich** / **Sieg für {opponent}**.
- **Right — opponent**: mirrored (name right-aligned, neutral avatar
  `bg-muted` + initials), sublabel **Gegner**.

The scoreboard is feedback, not input — it animates the mental model while the
game rows (§5) are the controls.

## 4. Section pattern & platform choice

Sections stack with `gap-9`. Section header = signature tick + h2
`font-heading text-[21px] font-bold uppercase tracking-[0.03em]
text-brand-blue dark:text-white whitespace-nowrap`, optional right-aligned
meta note `text-[12.5px] font-medium text-muted-foreground whitespace-nowrap`
(`flex items-baseline justify-between gap-3`).

**Wo habt ihr gespielt?** — two radio cards, `grid grid-cols-2 gap-3`
(keep `RadioGroup` semantics, style the labels):

```tsx
<label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 px-4 text-left
  has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/6">
  <RadioGroupItem value="showdown" className="mt-0.5" />
  <span className="flex flex-col gap-0.5">
    <span className="text-sm font-semibold text-brand-blue dark:text-white">Pokémon Showdown</span>
    <span className="text-[12.5px] leading-snug text-muted-foreground">
      Für jedes Spiel wird ein Replay-Link gebraucht.
    </span>
  </span>
</label>
```

Second card: **Cartridge** — „Auf der Konsole gespielt — Video-Link optional."
The description line is the point: the platform choice announces its
consequences before they appear.

## 5. Game rows — **Wer hat gewonnen?**

Right meta note: **Best of 3 — wer zuerst 2 Spiele gewinnt**. Rows
`flex flex-col gap-2.5`; each row `rounded-lg border p-3 px-3.5 flex flex-col
gap-2.5`:

- Row line `flex items-center gap-3.5`: label `w-[58px] shrink-0 text-xs
  font-semibold uppercase tracking-[0.08em] text-muted-foreground
  whitespace-nowrap` **Spiel {n}** + segmented winner pick `grid flex-1
  grid-cols-2 gap-2`.
- **Segments are the two player names** (`h-10 rounded-md border text-sm
  font-semibold whitespace-nowrap`): left **Kuro · Du** (the „· Du" suffix
  `font-medium opacity-65`), right **{opponent}**. Selected: reporter side
  `border-brand-orange bg-brand-orange/12 text-brand-blue`, opponent side
  `border-brand-blue bg-brand-blue/6 text-brand-blue` (`dark:text-white`).
  Unselected: `border-border bg-background text-muted-foreground`.
  Store the absolute winner directly — the UI no longer produces
  reporter-relative Win/Loss, so the form submits `winnerId` per game
  (adapt the `reportSchema` input mapping accordingly; `toResultRows`'s
  perspective flip becomes a no-op for this form).
- **Spiel 3 is always visible** and explains itself instead of popping in:
  - before a 1:1 split: row at `opacity-55`, no segments, note `text-[13px]
    text-muted-foreground h-10 flex items-center` — **Wird nur bei 1:1 nach
    zwei Spielen gespielt.**
  - 2:0 sweep: same treatment — **Entfällt — die Serie ist mit 2:0
    entschieden.**
  - at 1:1: full row with segments. A later change that removes the split
    resets game 3 (existing form behavior — keep it).
- **Showdown**: replay input inside the active row, indented under the
  segments (`pl-[72px]`): `Input h-9.5 text-[13.5px]` with placeholder
  `https://replay.pokemonshowdown.com/…` + trailing inline state
  `w-[60px] shrink-0 text-xs font-semibold`: **Pflicht** (muted, empty) /
  **✓** (green `oklch(0.55_0.15_150)`, matches
  `replay.pokemonshowdown.com`) / **Link?** (destructive-ish
  `oklch(0.55_0.2_25)`, non-empty but wrong host). Validation lives where
  the error is, not in a summary at the bottom.

## 6. Video (Cartridge) & Teamsheets

- **Video** section only when platform = cartridge, right meta **Optional**:
  one `Input h-10.5`, placeholder „z. B. YouTube-Link zur Aufnahme".
- **Teamsheets** — right meta **Beide Teams als Pokepaste-Link**; `grid
  grid-cols-2 gap-3`, per column label `text-[13px] font-semibold
  text-brand-blue dark:text-white whitespace-nowrap` — **Dein Team** / **Team
  von {opponent}** — over an `Input h-10.5 pr-9` (placeholder
  `https://pokepast.es/…`) with an absolutely positioned trailing **✓**
  (`text-sm font-bold`, green as §5) that appears once the value matches
  `pokepast.es`. `isPokepasteUrl` already exists — reuse it client-side.

## 7. Sticky submit bar

Fixed to the viewport bottom, full-width:
`fixed inset-x-0 bottom-0 border-t bg-background/94 backdrop-blur-lg`; inner
row mirrors the content column (`max-w-[760px] mx-auto px-8 py-3.5 flex
items-center justify-between gap-6`).

- **Left, two lines.** Title `text-[13.5px] font-semibold`:
  - incomplete (`text-muted-foreground`): **Noch offen: {items}** — items
    joined with „ · ", drawn from: `Plattform`, `Spiel {n}` (each unpicked
    needed game), `Replay-Links` (showdown, any needed game without one),
    `Teamsheets` (either empty), `Serie unvollständig` (fallback when fields
    are filled but no side has 2 wins).
  - complete (`text-brand-blue dark:text-white`): **Du meldest einen
    2:1-Sieg gegen {opponent}.** / **Du meldest eine 1:2-Niederlage gegen
    {opponent}.** — the bar doubles as the review step; no confirm dialog.
  - Subline `text-[12.5px] text-muted-foreground`: **Das Ergebnis ist nach
    dem Melden sofort final.** — always visible, both states.
- **Right**: `<Button size="lg">Ergebnis melden</Button>`, disabled until
  complete; pending label **Wird gemeldet…** (existing behavior). Server
  errors render as `text-destructive text-sm` above the bar inside the form.

## 8. Free win

- **Escape hatch** at the end of the form (`border-t pt-5 mt-11`,
  `flex items-baseline gap-2`): `text-[13.5px] text-muted-foreground` **Match
  nicht zustande gekommen?** + link-styled button `font-semibold
  text-brand-blue dark:text-white underline underline-offset-3` —
  **Freigewinn melden**. This replaces the top-of-form `Switch` entirely.
- **Free-win view** (same route, view state): back link **← Zurück zur
  Ergebnismeldung**, eyebrow **Spieltag {n} · {groupName} · vs. {opponent}**,
  h1 **Freigewinn melden**, then intro `text-[14.5px] text-muted-foreground
  max-w-[560px]`: „Für Matches, die nicht gespielt wurden. Ein Freigewinn
  muss **vorab mit dem Staff abgesprochen** sein und zählt erst, wenn ein
  Staff-Mitglied ihn bestätigt hat." (bold `font-semibold text-brand-blue
  dark:text-white`).
- Sections (pattern per §4): **Wer erhält den Freigewinn?** — two pick cards
  (`grid grid-cols-2 gap-3`), avatar + name + sublabel **Du** / **Gegner**,
  selected state as §4 cards. **Begründung** — `Textarea rows-4`, placeholder
  „z. B. Gegner war trotz mehrerer Terminvorschläge nicht erreichbar."
  **Mit wem abgesprochen?** — staff `Select` (`max-w-[340px]`), options
  labeled `{Name} · {Rolle}`, placeholder „Staff-Mitglied wählen …".
- Sticky bar (§7) swaps copy: incomplete **Noch offen: Spieler · Begründung ·
  Staff-Mitglied**; complete **Freigewinn für dich/{opponent} melden — wartet
  danach auf Staff-Bestätigung.**; subline **Zählt erst nach Bestätigung durch
  ein Staff-Mitglied.**; button **Freigewinn melden**.

## 9. Result summary (normal) — replaces `report-summary.tsx`

Shown to participants once a result exists; no sticky bar.

1. Eyebrow row `flex items-center justify-between`: tick + **Ergebnis ·
   Spieltag {n} · {groupName}** and a status chip `rounded-full
   bg-brand-blue/7 px-3.5 py-1 text-xs font-semibold uppercase
   tracking-[0.08em] text-brand-blue dark:text-white` — **Final**. Center
   the chip text with flex (`flex items-center justify-center`, span
   `leading-none`), not baseline layout.
2. h1 — **Sieg für dich** / **Sieg für {opponent}** (reporter perspective;
   `double_loss`, when the staff feature arrives, titles **Doppelniederlage**).
3. **Final scoreboard** — the §3 card, larger: avatars `size-[50px]`, names
   `text-[28px]`, score `text-[56px]`. Winner side carries tick `h-[7px]
   w-3.5 -skew-x-[18deg] bg-brand-orange` + `text-[11px] font-bold uppercase
   tracking-[0.12em] text-brand-orange` **Sieger** under the name (loser side:
   plain **Du** sublabel, nothing added).
4. Meta line `mt-3.5 flex items-center gap-2 text-[13px]
   text-muted-foreground whitespace-nowrap`: **{Plattform} · Gemeldet von
   {name} · {reportedAt, de-DE}** — dots as separate `text-border` spans.
5. **Spiele** section: one row per game (`flex items-center gap-3.5
   rounded-lg border px-4 py-3`): label **Spiel {n}** (as §5) + `flex-1
   text-sm font-semibold text-brand-blue dark:text-white` **Sieger: {name}**
   + replay as a real affordance, not a bare text link: outline-style anchor
   `rounded-md border px-3 py-1.5 text-[13px] font-semibold
   hover:border-brand-orange hover:bg-brand-orange/5` — **Replay ansehen ↗**.
6. **Teamsheets** section: two link cards `flex items-center justify-between
   rounded-lg border px-4 py-3.5 hover:border-brand-orange
   hover:bg-brand-orange/5` — left **Team {name}** (`text-sm font-semibold`),
   right `text-[13px] font-semibold text-muted-foreground` **pokepast.es ↗**.
   Cartridge with video: third full-width card **Video zum Match** /
   **Ansehen ↗**.
7. Footnote `border-t pt-5 mt-10 text-[13.5px] text-muted-foreground`:
   **Stimmt etwas nicht? Ergebnisse sind final — wende dich an den Staff, um
   eine Korrektur anzustoßen.** (Disputes are a later feature; the sentence
   is the interim path.)

## 10. Result summary (free win, pending)

1. Eyebrow **Freigewinn · Spieltag {n} · {groupName}**; status chip in
   **orange**: `bg-brand-orange/14 text-brand-blue` — **Wartet auf Staff**.
2. h1 — **Freigewinn für {name}**.
3. Banner `rounded-xl border border-brand-orange/45 bg-brand-orange/5 px-6
   py-5 flex flex-col gap-1.5`: `text-[15px] font-semibold text-brand-blue
   dark:text-white` **Noch nicht gewertet** over `text-sm
   text-muted-foreground` „Ein Staff-Mitglied prüft die Meldung. Erst nach
   der Bestätigung zählt der Freigewinn für die Tabelle — bis dahin bleibt
   das Match offen."
4. Detail stack (`flex flex-col gap-4.5`), each block label `text-xs
   font-semibold uppercase tracking-[0.12em] text-muted-foreground` over
   value: **Begründung** (body text, `max-w-[560px]`), **Abgesprochen mit**
   (`font-semibold`), **Gemeldet** (**Von {name} · {reportedAt}**).
5. Confirmed free win (staff feature, later): same layout, chip → **Final**
   (navy, §9), banner disappears, h1 unchanged.

## 11. Dark mode & details

- Everything resolves via tokens; orange tints (`/5`, `/12`, `/14`) work in
  both modes. Scoreboard card tint: `bg-muted/30` in dark instead of the
  near-white oklch.
- The green ✓ / **Link?** validation colors are the only non-token colors —
  add them as CSS vars if they recur elsewhere.
- Give every single-line label `whitespace-nowrap` (labels, chips, names,
  meta lines, section notes). Under preview zoom/fractional-pixel layout,
  max-content-sized flex items otherwise wrap mid-label — this bit us in the
  reference design.
- Status chips: always flex-center their text (`flex items-center
  justify-center` + `leading-none`), never rely on inline baseline — the
  uppercase 12px text sits visibly low otherwise. Compensate letter-spacing
  with `-mr-[0.08em]` so the text is optically centered.

## 12. Checklist

1. `site-header.tsx`: breadcrumb variant for `/match/[matchId]` (§1)
2. `match/[matchId]/page.tsx`: shell, back link, eyebrow + h1 (§1–2)
3. `report-form.tsx`: scoreboard (§3), platform cards (§4), name-pick game
   rows + always-visible Spiel 3 + inline replay validation (§5), video +
   teamsheets with ✓ (§6), sticky bar with missing-list / read-back (§7),
   free-win escape hatch + view (§8)
4. `report-summary.tsx`: final scoreboard, meta, game rows, link cards,
   footnote (§9); pending free-win variant (§10)
5. Input-shape note: form submits absolute `winnerId` per game (§5)
6. Both modes verified (§11), `npx biome check --write .`,
   `npx tsc --noEmit`, `npm test -- --run`
