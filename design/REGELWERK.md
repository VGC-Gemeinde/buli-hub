# Buli Hub — Regelwerk (design handoff, iteration 1)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still valid),
`ANMELDUNG.md` and `SPOILER-SCHUTZ.md`. Reference design: project file
"Regelwerk.dc.html" (1a document, 1b entry points, 2a reminder dialog, 2b gate
dialog, 2c acceptance block).

**This doc is ahead of the functional build.** Unlike the other hand-offs it does
not describe a design pass over an existing route — `/regelwerk` does not exist
yet. It therefore names the schema and server work the views need, but every
domain decision in §8 is the maintainer's to make before implementation starts.

Content source: the Saison-9 rules document supplied by the Orga. The design
reproduces it in full — no rule was dropped or reworded beyond formatting.

---

## 1. Naming and route

The route is **`/regelwerk`**, the noun is **„Regelwerk"** everywhere in the UI.

Do not call it „Regeln": that name is already taken inside the app for the staff
seeding rules (Auf-/Abstieg + Replay-Pflicht — `steps.ts`, `post-season-panel.tsx`,
step label „Regeln"). Two different things called „Regeln" in one product is a
support problem.

`/regelwerk` always serves the **running season**. The h1 block names the season
explicitly, so an old Discord link never silently shows the wrong ruleset.

Public route — readable while signed out. It has to be, because registration
requires accepting it.

## 2. The document (`/regelwerk`)

### 2.1 Shell

`SiteHeader` (no breadcrumb) + `SiteFooter` as everywhere else. The page body is
a two-column layout inside the standard `max-w-[1040px]` container:

```tsx
<div className="mx-auto flex w-full max-w-[1040px] gap-10 px-6 py-12">
  <aside className="sticky flex w-56 shrink-0 flex-col gap-3 self-start" style={{ top: 24 }}>…</aside>
  <main className="flex min-w-0 max-w-[760px] flex-1 flex-col gap-12">…</main>
</div>
```

`max-w-[760px]` is the same reading measure as `LegalPage` — this is a document,
and it should feel like the Impressum's sibling, not like a dashboard.

Do **not** reuse `LegalPage` itself: it has no sidebar, and its `[&_h2]` prose
styling fights the `SectionHeader` component used per chapter.

### 2.2 Chapter list (the aside)

Kicker `Inhalt` (Tick S neutral + `text-xs font-semibold uppercase tracking-[0.12em]
text-muted-foreground`), then a `border-t pt-2.5` list of the four chapters,
`row-gap: 2px`:

```tsx
<a href="#bewertung" className={cn(
  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
  active
    ? "font-semibold text-brand-blue dark:text-white"
    : "font-medium text-muted-foreground hover:bg-secondary",
)}>
  <span className={cn("inline-block size-1.5 shrink-0 -skew-x-[18deg]", active ? "bg-brand-orange" : "bg-border")} />
  4 · Bewertung
</a>
```

The dot is a micro-tick (`-skew-x-[18deg]`), not a bullet — it is the signature
element at its smallest, and it is what makes the active chapter legible at a
glance.

**Active chapter** = the last chapter heading whose top is above 160px. Client
component, `scroll` listener (passive) or `IntersectionObserver`; no URL
mutation while scrolling (it would flood the history).

Below the list, separated by `border-t pt-4`: a `text-[12.5px] text-muted-foreground`
line pointing at `#fragen-antworten` plus a Discord link. The rules doc ends by
sending players there; the sidebar makes it reachable from anywhere in the text.

### 2.3 Page head

```tsx
<h1 className="text-[40px] text-brand-blue leading-[1.05] dark:text-white">Regelwerk</h1>
<div className="flex items-center gap-2">
  <Tick size="s" />
  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
    Saison 9 · Gültig ab 07.09.2026
  </span>
</div>
```

Then one `text-[14.5px] text-muted-foreground leading-[1.65]` paragraph stating
that registration means understanding and accepting the rules, and that changes
are announced on Discord. Same status-line pattern as `/anmeldung` §1 — season
and validity are never a guess.

### 2.4 „Auf einen Blick" — six tiles

A `grid grid-cols-3 gap-3` directly under the head. Each tile:
`flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3.5`, kicker
`text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`,
value `font-heading font-bold text-brand-blue dark:text-white`.

| Tile | Value | Type size |
|---|---|---|
| Anmeldeschluss | `30.08.2026` | `text-[20px] tabular-nums` |
| **Saisonstart** | `07.09.2026` | `text-[20px] tabular-nums` |
| Dauer | `10–12 Wochen` | `text-[20px]` |
| Modus | `Best of 3 · Open Team Sheet` | `text-[15px]` |
| Spielplan | `Single Round Robin` | `text-[15px]` |
| Division | `max. 10 Spieler` | `text-[15px]` |

Saisonstart is the one emphasised tile: `border-brand-orange bg-brand-orange/5`
(same checked-card treatment as the registration radios). Exactly one orange
tile — it is the date everything else hangs off.

These six facts are what players look up without wanting to read; putting them
above the first chapter is what keeps the document from being scrolled blindly.

### 2.5 Chapter pattern

Four chapters, `id` = anchor: `#anmeldung`, `#struktur`, `#ablauf`, `#bewertung`.
`main` uses `gap-12` between chapters, each chapter `flex flex-col gap-6`.

```tsx
<section id="bewertung" className="flex flex-col gap-6">
  <SectionHeader meta="Kapitel 4">Bewertung</SectionHeader>
  …
</section>
```

Sub-sections inside a chapter: `h3` at `text-[17px] text-brand-blue dark:text-white`
(uppercase comes from globals) + body. Body is either a prose list (§2.6) or one
of the four pull-outs (§2.7).

### 2.6 Prose lists — READ THIS BEFORE IMPLEMENTING

The rules are mostly bullet lists, and **the app's preflight sets
`ol, ul, menu { list-style: none }`**, with no `.list-disc` utility compiled. A
plain `<ul className="list-disc pl-5">` renders as indented text with no markers.

Two things are required:

```tsx
<ul className="pl-5 text-[14.5px] text-muted-foreground leading-[1.65]" style={{ listStyle: "disc outside" }}>
  <li className="mb-1.5">…</li>
</ul>
```

1. an explicit `list-style` (inline, or add a `.list-disc` rule to `globals.css`
   — the latter is better if lists appear anywhere else),
2. the `ul` must **not** be `display: flex`. Flex items lose their markers, so
   `flex flex-col gap-1.5` silently kills the bullets. Space the items with
   `mb-1.5` on the `li` instead (`space-y-*` is not compiled either).

Key terms inside a bullet get `font-semibold text-foreground` — dates,
thresholds, „freie Teamwahl", „Wesen", division numbers. Nothing else is
emphasised; the bold words are the scan layer.

### 2.7 The four pull-outs

These are the rules players consult mid-match. As bullets they are unusable, so
each becomes a small diagram. All four are `rounded-lg border border-border
bg-card p-6`, titled with `Tick size="m"` + `text-[13px] font-semibold uppercase
tracking-[0.16em] text-muted-foreground`.

**a) Deine Spielwoche** (chapter 3, above „Scheduling"). Seven equal cells,
`flex gap-1`, each `flex flex-1 flex-col items-center gap-1.5 rounded-md bg-muted
py-2.5` with day abbreviation (`font-heading font-bold text-[13px]`) and a
sub-label. Mo shows `0:00`, So shows `23:59`, the others `—`. **Mi** is the one
highlighted cell: `border border-brand-orange bg-brand-orange/5`, sub-label
`Meldefrist` in `font-semibold text-[11px] text-brand-orange`. Below it, one
`text-[13px]` paragraph stating the Mo 0:00–So 23:59 window, the Wednesday
contact deadline and the Freewin consequence, and that all times are German time
(`docs/decisions/german-time.md`).

**b) Punkte** (chapter 4). `grid grid-cols-3 gap-3`, each tile
`flex items-center gap-3.5 rounded-lg px-4 py-3.5` with the number at
`font-heading font-bold text-4xl tabular-nums` next to a two-line label at
`text-[13px] font-medium leading-snug`.

- `3` — Best of 3 gewonnen — `border-brand-orange bg-brand-orange/5`, number `text-brand-orange`
- `0` — Best of 3 verloren — `border-border bg-card`, number `text-muted-foreground`
- `0` — Nicht angetreten (`gilt als 0–2`) — same as above

Orange is the win, per the brand rule; the losses are neutral, never red.
Below: the Freewin 2–0 / Doppelniederlage 0–2 sentence at `text-[13px]`.

**c) Tiebreaker** (chapter 4). An ordered ladder — the *order* is the rule, so
this cannot be a bullet list. Three cards, `flex gap-4 rounded-lg border
border-border bg-card p-4`, each led by its number at `font-heading font-bold
text-[22px] text-brand-orange tabular-nums leading-none`, then title
(`font-heading font-bold text-[15px] text-brand-blue uppercase tracking-[0.02em]
dark:text-white`) + explanation at `text-[13px] text-muted-foreground leading-[1.55]`.

Tiebreaker 2 carries a qualifier pill next to its title —
`rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase
tracking-[0.06em] text-muted-foreground` reading `nur in Gruppentabellen`. Same
pill marks the two `Champions`-only Strafen cards.

After the ladder, the shared-place rule as a muted callout (§2.8).

**d) Nichtantreten** (chapter 4). Three columns, `flex items-start gap-2`, each
`flex flex-1 flex-col gap-1.5`: time (`font-heading font-bold text-[15px]
tabular-nums`), a `h-[3px]` rule, then the action at `text-[12.5px]`.

| Column | Rule colour | Content |
|---|---|---|
| `0 min` | `bg-border` | Gegner im Division-Channel taggen — ohne Tag später kein Win |
| `10 min` | `bg-brand-orange` | **Gamewin** einforderbar: @Staff - Liga taggen, Nachweis, Gegner erneut taggen |
| `15 min` | `bg-brand-orange` | **Setwin** einforderbar |

The `h-[3px]` bar is the header's accent line reused as a timeline — orange
marks the segments where the present player has gained a claim.

### 2.8 Muted callout

For hard rules that must not be skimmed past: `rounded-lg border border-border
bg-muted p-4`, Tick S + `text-[11px] font-semibold uppercase tracking-[0.12em]
text-foreground` kicker + `text-[13px] text-muted-foreground leading-[1.55]` body.

Used four times, and only these: **Replay-Pflicht** (Div 1 & 2, Tick orange),
**Nachrichten sind unveränderlich** (Tick navy), **Greift kein Tiebreaker**
(Tick navy), and the „Bis dahin" box inside the gate dialog (§5.2).

No left-border accent bars — `DESIGN.md` forbids them.

### 2.9 Closing block

`border-t pt-6`, the `#fragen-antworten` sentence at `text-[14.5px]
text-muted-foreground`, then `Eure VGC Gemeinde` as `font-heading font-bold
text-[15px] text-brand-blue uppercase tracking-[0.02em] dark:text-white`. The
Orga signs the document; keep it.

## 3. Entry points

Reference: 1b.

1. **Footer** — a `Regelwerk` link beside Impressum and Datenschutz in
   `site-footer.tsx`, before the Feedback entry. Same `text-muted-foreground
   hover:text-foreground` treatment; on `/regelwerk` itself it is
   `font-semibold text-brand-blue dark:text-white`. This is the permanent,
   signed-out-reachable home of the document.
2. **`/anmeldung`** — an acceptance checkbox in `registration-form.tsx`, above
   the submit: `Ich habe das Regelwerk der VGC Bundesliga gelesen und akzeptiere
   es.` with the document title as an `InlineLink` to `/regelwerk`,
   `target="_blank"` so the half-filled form survives. Submit is disabled until
   it is ticked. The rules require participants to understand and accept them —
   registration is the only place that becomes verifiable.
3. **Spieler-Dashboard** — a quiet side card (kicker `Saison 9`, title
   `Regelwerk`, one line of copy, `ActionLink` „Regelwerk öffnen") for in-season
   lookups. Not a CTA.

**Deliberately not in `HeaderNav`.** The nav is signed-in only and has three
entries; the Regelwerk must be readable *before* registration. Footer plus
contextual links covers both audiences without diluting the nav.

## 4. Acceptance model

Acceptance is **per season**, so it is a row, not a boolean on the profile:
season/window id + user id + timestamp. Saison 10 requires a fresh acceptance.
The timestamp is shown back to the player (§5.3) and is what the Orga cites in a
dispute.

**The acceptance control never lives in a dialog.** A player who can tick a box
in a modal has not read the rules, which makes the record worthless exactly when
it matters. The dialogs route to the document; the confirmation happens at the
end of it.

## 5. Acceptance dialogs

Both use the existing `Dialog` (`dialog.tsx`). `DialogContent`'s default
`sm:max-w-sm` is too narrow — override to ~420px. `DialogTitle` renders an `h2`,
so it inherits condensed uppercase; that is intended.

### 5.1 Reminder — registration open, season not started (2a)

Shown to a **registered** player who has not accepted yet.

- Kicker: Tick S orange + `Saison 9 · Noch offen`
- Title: `Regelwerk bestätigen`
- Body: `Du bist für Saison 9 angemeldet. Bevor die Saison am 07.09.2026
  startet, musst du das Regelwerk gelesen und bestätigt haben.` (the date bold
  via `font-semibold text-foreground`)
- Hint, `text-[12.5px]`: `Bestätigen kannst du am Ende des Regelwerks.`
- Footer (`DialogFooter`, default styling): `Später` (ghost) + `Regelwerk lesen`
  (primary → `/regelwerk`)
- `showCloseButton` stays `true`; outside click and Esc close it

**Frequency: once per session**, not per navigation. A reminder that reappears on
every page turn is an error message. Session storage is enough — it must not
outlive the browser session, or a player who dismisses it once never sees it again.

### 5.2 Gate — season running (2b)

Shown when an **unaccepted** player opens a season page.

- Kicker: Tick S **navy** + `Saison 9 · Erforderlich` (navy = structural /
  officiating, per the brand rule; the reminder is orange because it is an
  invitation, the gate is not)
- Title: `Regelwerk bestätigen`
- Body: `Die Saison läuft. Um Ergebnisse zu melden, Termine festzuhalten oder
  dein Teamsheet einzureichen, musst du das Regelwerk zuerst bestätigen.`
- Muted callout `Bis dahin`: `Tabellen, Spielplan und Ergebnisse kannst du
  weiter ansehen. Nur Aktionen sind gesperrt.`
- Footer: a single primary `Regelwerk lesen und bestätigen`
- `showCloseButton={false}`, `onInteractOutside` and `onEscapeKeyDown`
  prevented — the only way out is into the document

**The gate blocks actions, not content.** Read-only stays open. A player who can
see nothing writes to the Orga; a player who can still see the table reads the
rules. Enforcement belongs in the server actions as well as the UI — a disabled
button is not authorization.

Copy for a blocked control's disabled state: `Erst Regelwerk bestätigen`.

### 5.3 Confirmation in the document (2c)

**Open state** — after the closing block: `rounded-lg border border-brand-orange
bg-brand-orange/5 p-5`, a `Checkbox` + `label` at `text-[13px] leading-[1.55]`
reading `Ich habe das Regelwerk der VGC Bundesliga für Saison 9 gelesen und
akzeptiere es.`, then `border-t pt-3.5` with the `Bestätigen` button (disabled
until ticked) and `Deine Bestätigung wird mit Zeitstempel gespeichert.` at
`text-[12.5px] text-muted-foreground`.

**Confirmed state** — replaced by a calm line: `rounded-lg border border-border
bg-muted p-5`, Tick S neutral + `Bestätigt am 31.07.2026, 14:20` (timestamp
`font-semibold text-foreground`). No success banner, no colour change. The line
stays permanently: it is the receipt.

**Sticky bar** — while unaccepted, fixed to the bottom of the viewport:
`rounded-lg border border-border bg-popover px-5 py-3.5 ring-1 ring-foreground/10`,
Tick S orange + `Regelwerk noch nicht bestätigt` on the left, `Zur Bestätigung ↓`
(anchor to the block) on the right. Removed once accepted. The document is long
enough that without it a player reaches the bottom not knowing something was
expected of them.

## 6. Mobile — adjustments still required

**The design above is desktop-first and is not finished for mobile.** Per the
repo's working method, the design pass covers desktop and the implementation
owns the mobile adaptation. The specific decisions needed:

- **Chapter list.** A `w-56` sticky sidebar has no room below `lg`. Below that
  breakpoint drop the two-column layout to one and turn the aside into a
  collapsed chapter list directly under the page head (a `<details>` „Inhalt", or
  a horizontally scrollable chip row). Do **not** keep it sticky on mobile — it
  would eat a third of the viewport. The scroll-spy is then decorative; that is
  acceptable.
- **Auf einen Blick.** `grid-cols-3` → `grid-cols-2` (or a single column on the
  narrowest widths). Do not shrink the type to keep three across; 12pt is the floor.
- **Deine Spielwoche.** Seven cells across do not fit. Either two rows (4 + 3) or
  a vertical list with the day on the left; the Mi highlight must survive either way.
- **Punkte.** `grid-cols-3` → one column, tiles full width, number left of the
  label as on desktop.
- **Nichtantreten timeline.** Three columns become three stacked rows; the
  `h-[3px]` rule then reads as a divider above each step, which still works.
- **Tiebreaker cards.** These already stack; only check that the qualifier pill
  wraps below the title instead of squeezing it (`flex-wrap` is already on that row).
- **Dialogs.** `DialogContent`'s `max-h-[calc(100dvh-2rem)]` + `overflow-y-auto`
  handle the height; the gate dialog's single button should go full width
  (`DialogFooter` is `flex-col-reverse` below `sm:` already).
- **Sticky acceptance bar.** Check it does not cover the `Bestätigen` button it
  points at — hide the bar once the confirmation block is in view.
- **Tap targets.** Chapter links and the checkbox row need ≥44px on touch;
  `py-1.5` on the chapter links is not enough on its own.

## 7. Implementation notes and traps

- **The class vocabulary is finite.** Only classes that already exist in the repo
  or the safelist compile. Verified missing while building the reference design:
  `list-disc`, `top-6`, `gap-px`, `w-max`, `space-y-*`, `leading-[1.35]`,
  arbitrary widths like `w-[1120px]`. Everything specified above is either
  present in the repo or given as an inline style. When in doubt, copy the class
  from an existing component rather than composing a new arbitrary value.
- **`/dev/ui`.** The gallery must gain the new visual states: reminder dialog,
  gate dialog, acceptance block open + confirmed, sticky bar. Part of definition
  of done per `CLAUDE.md`.
- **`/dev` personas.** A registered-but-unaccepted persona is needed to reach
  either dialog at all.
- **Rules content source.** Whether the text is hardcoded per season in the repo
  or staff-editable content is an open decision (§8) and changes the feature's
  shape considerably. The design assumes a single canonical document per season.

## 8. Open domain decisions (maintainer)

These are not design questions. They block implementation:

1. **Which actions does the gate cover?** The design assumes Ergebnis melden,
   Termin festhalten, Teamsheet einreichen. Anything else in-season?
2. **Players who never accept.** Proposal: they stay registered and seeded but
   remain action-locked, and appear in a `Regelwerk offen` list in the
   Staff-Bereich so the Orga can chase them before the division split. Needs a
   ruling — the alternative (blocking seeding) changes the Anmeldung flow.
3. **Content ownership.** Hardcoded per season, or editable by staff?
4. **Does an existing registration without acceptance stay valid?** Registration
   is already open for Saison 9, so there are registered players who have never
   seen an acceptance step. The design treats them as „registered, not accepted"
   and shows them 5.1 — confirm that is the intent rather than invalidating
   their registration.

## 9. Checklist

1. Schema: acceptance row (season/window id + user id + accepted_at) +
   migration; query for „has the current user accepted the current season".
2. New route `src/app/regelwerk/page.tsx` + `src/features/regelwerk/` per §2;
   chapter list as a client component (scroll-spy), everything else server-rendered.
3. Prose lists: add a compiled `.list-disc` rule to `globals.css` or use the
   inline `listStyle` per §2.6 — verify markers actually render in both modes.
4. Footer link (§3.1), Anmeldung checkbox + gated submit (§3.2), dashboard card (§3.3).
5. Acceptance server action + the confirmation block, confirmed state and sticky
   bar (§5.3).
6. Reminder dialog, session-scoped (§5.1); gate dialog, non-dismissible (§5.2).
7. Enforce acceptance in the affected server actions, not only in the UI (§5.2).
8. Extend `/dev/ui` gallery and `/dev` personas (§7).
9. Mobile pass per §6 — explicitly, this is not covered by the reference design.
10. Verify both modes, `npx biome check --write .`, `npx tsc --noEmit`,
    `npm test -- --run`.
