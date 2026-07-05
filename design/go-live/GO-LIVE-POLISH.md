# Buli Hub — Go-Live Polish (design handoff)

Companion to `DESIGN.md` (tokens, fonts, signature elements) and the feature
handoffs (`ANMELDUNG.md`, `STAFF-BEREICH.md`, `SAISON-DASHBOARD.md`,
`MATCH-REPORTING.md`, `SPIELER-DASHBOARD.md`, `SPIELPLAN-ERSTELLUNG.md`,
`DIVISIONS-EINTEILUNG.md`, `AUF-ABSTIEG.md`). Those stay valid **except where
this document overrides them** — this is the last design pass before launch,
audited against the full screenshot matrix of the live dev stack
(2026-07-04, 232 shots: 8 phases × roles × light/dark × desktop/mobile).

Reference designs: interactive project file **"Polish-Katalog.dc.html"**
(the spec as a browsable document) plus one canonical `.dc.html` per view —
the file map is in §12. Every design file has a Tweaks panel; switch through
its states, each state is normative.

> ## ⚠ The design files are desktop references — not production HTML
>
> Every `.dc.html` is authored at desktop width (1280px+) and is **not
> mobile-optimized at all**. Do not copy their markup literally. They specify
> layout, hierarchy, spacing, colors and copy — the responsive adaptation is
> the implementing agent's job, using the codebase's existing Tailwind
> breakpoint patterns (`sm:`, `lg:`, `flex-wrap`, stacking grids). Hard
> requirements for the mobile adaptation: hit targets ≥ 44px, two-column
> grids stack (`grid-cols-1 lg:grid-cols-*`), pill rows wrap, tables keep all
> columns legible at 390px (drop Diff. before dropping Bilanz if space runs
> out), sticky bars stay above the iOS home indicator
> (`pb-[env(safe-area-inset-bottom)]`). The existing mobile behavior of
> already-shipped views is the benchmark — new views must match it.

**Priorities:** §1 = P0 (launch blockers) · §4 = P1 (redesigns) ·
§2/§3/§5 = P2 (consistency sweep) · §6–11 = P3 (safeguards). Checklist in §13.

---

## 1. Launch blockers (P0 — bugs, not design debt)

### 1.1 Report form: sticky bar overlaps Teamsheets

`report-form.tsx` / `match/[matchId]/page.tsx`. In production the fixed
"Noch offen … / Ergebnis melden" bar covers the two pokepast inputs and the
**Teamsheets** section heading is missing entirely. The original spec
(MATCH-REPORTING.md, "Ergebnis melden.dc.html") already had this right —
restore it:

- Teamsheets is a regular in-flow section: section head (tick M + h2
  **Teamsheets** + meta right „Beide Teams als Pokepaste-Link"), then
  `grid grid-cols-2 gap-3` with labeled inputs (**Dein Team** / **Team von
  {Gegner}**), 42px height, trailing green ✓ when the URL validates.
- `main` gets `pb-[140px]`; the bar is `fixed inset-x-0 bottom-0` with
  `bg-white/94 backdrop-blur border-t`, inner column `max-w-[760px]`.
  Nothing may ever sit underneath it.

### 1.2 Disabled primary buttons look broken

Disabled orange buttons currently render washed-out orange with white text
(Anmeldung absenden, Ergebnis melden, dialog confirms). New rule, everywhere:

- disabled = neutral chip: `bg-[oklch(0.92_0.01_262)]
  text-[oklch(0.6_0.02_262)]`, `cursor-default`, no opacity trick.
- Orange is reserved for actionable buttons. No exceptions.

### 1.3 Empty Anzeigename field

The disabled Anzeigename input in the registration form renders as an empty
grey box when `displayName` is null. Fallback chain: `displayName` →
`username` → **„Discord-Nutzer"** — never empty. Apply the same chain to
every player-name render (avatars currently show „Unbekannt" rows).

---

## 2. Brand decisions — update `DESIGN.md`

These supersede the corresponding parts of `DESIGN.md`; update that file so
nobody "fixes" the UI back.

### 2.1 Text on orange is white (replaces DESIGN.md §1)

`--primary-foreground: #ffffff`. Applies to buttons, active pills/tabs,
solid chips, counters. Labels ≤ 12px on solid orange: `font-semibold`
minimum (contrast).

### 2.2 Sanctioned tick sizes (skewX(-18deg), always)

| Size | px (w×h) | Next to |
|---|---|---|
| S | 14×7 | micro labels 12–13px uppercase: status lines, kickers, nav, menu entries |
| M | 18×9 | section headers (h2), panel titles |
| L | 22×11 | page titles (h1), landing credit |

Neutral/inactive tick: `bg-border` instead of orange. These replace the five
ad-hoc sizes in production (16×8, 18×9, 22×11, 14×7, 20×9).

### 2.3 One section-header component

Replaces `StaffSectionHeader`, `SectionHeading`, `SectionHead`:
tick M + h2 `font-heading font-bold uppercase tracking-[0.03em] text-[24px]
text-brand-blue dark:text-white` · `border-b pb-3` · optional meta right
`text-[13px] text-muted-foreground` · optional count badge `rounded-full
bg-muted px-2 py-0.5 text-[12.5px] font-semibold tabular-nums`.

### 2.4 Page titles

Exactly two sizes, `font-heading` condensed uppercase: **40px** standard
(Anmeldung, Profil, Staff-Bereich, Ergebnis melden, Spieler-Dashboard
states) · **34px** compact when meta elements sit beside/right of it
(Liga-Übersicht, „Deine Saison"). Dense tool headers (Seeding workspace,
Auf-&-Abstieg dialog) stay 28px — they are workspace chrome, not page
titles.

### 2.5 Containers

Three widths: **640px** narrow (Profil, Anmeldung, Spieler wait states) ·
**760px** reading (Match, Legal) · **1040px** wide (dashboards,
Liga-Übersicht; Staff moves from 960 → 1040). Uniform `px-6`/`px-8`,
`py-12`. Footer inner width follows the page container.

### 2.6 Micro labels

Uppercase labels: `tracking-[0.12em]`, 12–13px, `font-semibold` —
everywhere. Single exception: the landing credit keeps `0.16em`.

### 2.7 Links — two styles only

- **Inline** (in prose): brand-blue, `underline underline-offset-[3px]`.
  Legal pages switch from orange to this.
- **Action** (standalone): `font-semibold text-brand-blue dark:text-white`
  with trailing „→", hover underline („Zum Spieler-Dashboard →",
  „Ansehen →").
- Bare text links that act like buttons become outline buttons (Saison-strip
  „Divisionen"/„Spielplan": `h-8 rounded-lg border px-3.5 text-[13.5px]
  font-medium`).

### 2.8 Empty/edge-state card (one pattern)

Card `rounded-xl border px-8 py-7`, tick M (orange = action available,
`bg-border` = informational) + condensed title 22–24px + body
`text-[15px] leading-relaxed text-muted-foreground` + optional one action.
Replaces bare sentences (Anmeldung edge states, seeding gate, guest match
page) and the dashed-border special case.

### 2.9 Zone palette (standings)

Decoupled from brand orange so orange keeps meaning „active / you":
**Meister-Playoff** yellow `oklch(0.85 0.16 90)` · **Aufstieg direkt** green
`oklch(0.6 0.12 158)` · **Auf-/Abstiegs-Playoff** amber `oklch(0.78 0.13
78)` · **Abstieg direkt** red `oklch(0.55 0.19 27)`. Row treatment: 6px left
rail + row tint at /7–/10 alpha; legend below the table (14×5px swatches,
12.5px labels). Applies to Liga-Übersicht, Divisionstabelle,
Spieler-Dashboard table, Auf-&-Abstieg preview chips.

---

## 3. Header & navigation (`site-header.tsx`)

1. **Staff/Admins get a second nav entry** „Staff-Bereich" (tick S) next to
   „Spieler-Dashboard" — currently reachable only via the avatar menu. The
   menu entry stays as well.
2. **Active state**: current page `font-semibold text-brand-blue
   dark:text-white`; inactive `font-medium text-muted-foreground`, hover →
   blue. Sub-pages keep the breadcrumb, separator „/" in `text-border`
   everywhere.
3. **„Liga" nav entry** for signed-in users while a season runs (the public
   overview on `/` currently has no nav presence). Guests keep logo +
   sign-in only.

---

## 4. Redesigns to implement (P1)

Each subsection = one ticket. The named `.dc.html` is the normative spec;
values below are the essentials, not a substitute for reading the file.
Suggested order (public visibility first): 4.5 → 4.4 → 4.1 → 4.2/4.3 →
4.7 → 4.8 → 4.6 → 4.11 → §3 → 4.9/4.10.

### 4.1 Profil — full redesign (`Profil.dc.html`)

`/profil`, container 640px:

- **Identity block**: avatar 84px round · name h1 40px condensed uppercase ·
  role badge: outline pill (`border rounded-full px-3 py-1 text-xs
  font-semibold uppercase tracking-[0.08em]`) with tick S (12×6) inside ·
  `@username` 14px muted underneath. Role labels: Spieler / Staff / Admin.
- **Section „Für die Orga"**: section head per §2.3 with the **save
  indicator** right-aligned in the head row — dot 6px + 13px label:
  Speichern… (orange dot) / Gespeichert (green `oklch(0.55 0.13 155)`) /
  Fehler beim Speichern (destructive, text also destructive) / idle renders
  nothing.
- Intro line under the head: „Alle Angaben hier sind freiwillig — sie helfen
  uns bei Social-Media-Posts und Liga-Content."
- **Fields**: Twitter + Bluesky side by side (`grid grid-cols-2 gap-3.5`,
  helper line spans both columns), Herkunft full width, all inputs **38px**
  height / `rounded-lg` (kills the current 32 vs 36px mismatch; the
  @-prefix wrapper matches exactly). Helper texts 13px muted.
- **Capture Card**: own row under a `border-t pt-5`, label + helper left,
  switch right (track 40×22, knob 18px white, on = orange track).

### 4.2 Anmeldung edge states (`Anmeldung.dc.html`, screens 1e)

All three states keep h1 + status line (tick S; orange when open, border-grey
otherwise) and get an edge-state card per §2.8 instead of a bare sentence:

- **Signed out, open**: card title **„Sei in Saison {n} dabei"**, body
  „Melde dich mit deinem Discord-Konto an, um dich für die nächste Saison zu
  registrieren. Die Anmeldung dauert keine zwei Minuten.", primary button
  (44px) **Mit Discord anmelden** + deadline inline „Läuft bis {dd.MM.yy,
  HH:mm}". Below the card: info line (ⓘ 15px icon) „Du brauchst ein Konto
  auf dem Discord-Server der VGC Gemeinde."
- **Noch nicht geöffnet**: orange tick M (action will come), title **„Noch
  nicht geöffnet"**, body points to the Discord announcement.
- **Geschlossen**: grey tick M, title **„Anmeldung geschlossen"**, body +
  timestamp line „Geschlossen seit {d. MMMM yyyy, HH:mm}" (13px muted).

### 4.3 Anmeldung confirmation polish (screen 1d)

- Detail rows become a bordered **definition table**: `rounded-xl border
  overflow-hidden`, rows `grid grid-cols-[180px_1fr] px-5 py-3` with
  `divide-y`; labels 12px uppercase `tracking-[0.1em]` muted, values 14px
  medium. Only rows with data render.
- Withdraw: outline button with destructive text (`border
  text-destructive`) labeled **„Anmeldung zurückziehen"** (not „Abmelden" —
  collides with sign-out), deadline helper under it.
- Submit buttons across all form screens: 44px, `rounded-lg`, white text
  (§2.1); disabled per §1.2.

### 4.4 Match page: public view, dispute, staff panel (`Ergebnis melden.dc.html`)

New props in the file: `viewer` (spieler/gast/staff), `angefochten`,
`dialog`. MATCH-REPORTING.md stays valid for form/result/freewin; new on
top:

- **Public view (guest, no result)** — replaces the bare „Noch kein Ergebnis
  gemeldet." page: back link „← Zur Übersicht" (→ `/`), kicker **Spieltag
  {n} · Division {group} · Saison {s}**, h1 **{A} vs. {B}**, match card
  (avatars 46px, center chip **Offen** + „Best of 3"), meta line (week range
  + „Ergebnis wird nach der Meldung hier angezeigt"), then edge-state card
  **„Noch kein Ergebnis"** (grey tick) explaining that Spiele, Replays und
  Teamsheets erscheinen nach der Meldung. Guests get sign-in button in the
  header, no nav. A reported match shows the normal public result view
  (no dispute affordances).
- **Dispute (participant)**: under the result, `border-t pt-5`: line
  „Stimmt etwas nicht? Ergebnisse sind final — eine Anfechtung wird vom
  Staff geprüft." + outline-destructive button **Ergebnis anfechten** →
  dialog: title **Ergebnis anfechten**, description „Ein Staff-Mitglied
  prüft die Meldung. Das Ergebnis zählt vorerst weiter, bis der Fall
  entschieden ist.", label **Was stimmt nicht?** + textarea, footer
  Abbrechen / **Anfechtung senden** (disabled until text, per §1.2).
- **Disputed state**: status chip next to the kicker flips **Final** →
  **Angefochten** (`bg-destructive/9 text-destructive`); banner card at the
  bottom (destructive tint) with the quoted reason + „Das gemeldete Ergebnis
  zählt vorerst weiter, bis der Staff entschieden hat."
- **Staff panel**: navy-bordered card (tick M navy + condensed **Staff** +
  „Nur für Staff sichtbar"), actions: outline **Ergebnis bearbeiten**;
  when disputed additionally primary **Anfechtung entscheiden** → dialog:
  score + Spieltag context, quoted dispute in a destructive-tinted box
  („Anfechtung von {name}"), guidance line, footer Abbrechen / outline
  **Ergebnis bearbeiten** / primary **Ergebnis bestätigen** (both resolve
  the dispute). SAISON-DASHBOARD.md §7 remains valid for the other staff
  actions; navy stays the officiating color.
- Staff back link/breadcrumb root: **Staff-Bereich**.

### 4.5 Liga-Übersicht — public in-season `/` (`Liga-Übersicht (Public).dc.html`)

The most public surface; new canonical design (production is close — this
locks the spec + §5 fixes):

- Container 1040px. Title row: tick L + h1 34px **VGC Bundesliga** + micro
  meta „· Saison {n}"; right **Spieltag {c} / {t}** (12–13px per §2.6).
- **Division switcher**: pill container (`border rounded-full p-[3px]`),
  pills 30px, uppercase 13px semibold; active `bg-brand-orange text-white`.
- **Group switcher**, second row: **short labels** „1A 1B 1C…" — the
  division is already named in row one (drop the „Division"-prefix
  redundancy).
- Grid `1.15fr / 1fr gap-8`: **Tabelle** (section head per §2.3, meta
  „Division {1a}") — columns Pl./Spieler/Bilanz/Diff./Punkte, zone rails +
  tints + legend per §2.9, signed-in viewer's row highlighted orange/6 with
  „Du" tag. **Spielplan** (meta identical to the table meta — both sides
  say „Division 1a"): „Spieltag {r} von {t}" + week range, **clickable
  segment timeline** (selected orange, current orange/45, past navy/30,
  future muted), match rows (avatar 24 + name | score `tabular-nums` or
  „offen" muted | name + avatar, winner semibold), rows link to
  `/match/{id}`.
- Gesamt mode (division-level table) per `division-table` plan and
  `Divisionstabelle (Spieler).dc.html`: „Gesamt" as first entry of the group
  switcher, group chips on rows, zones only on the relevant table.

### 4.6 Landing unification (`Landing.dc.html`)

One hero for both auth states: logo 148px `rounded-2xl shadow` + h1 68px —
constant. Only the CTA block swaps: guest → primary **Mit Discord anmelden**
(+ auth-error line); signed-in → tagline (17px muted, max-w 440px) +
primary **Zum Spieler-Dashboard**. Credit line ticks: M (18×9). Kills the
current 132/148px + text-6xl/7xl divergence.

### 4.7 Spieler-Dashboard additions (`Spieler-Dashboard.dc.html`)

- **Pre-season states** (prop `zustand`), all in the 640px narrow container
  under h1 40px: `anmeldung_offen` → orange-tinted CTA card („Die Anmeldung
  läuft" + „Jetzt anmelden" primary); `keine_saison` → grey-tick card
  („Gerade läuft keine Saison"); `nicht_platziert` → grey-tick card („Du
  bist in der laufenden Saison nicht dabei"). All per §2.8.
- **Hero result state** (prop `heroGemeldet`): same left half (kicker
  **Ergebnis · Spieltag {n}**, VS row); right half: **Sieg/Niederlage**
  chip + condensed score 30px + action link **Ansehen →** (§2.7 — replaces
  the 13px muted link). Right-half height matches the deadline variant so
  the card doesn't jump between states.
- Deadline chip when urgent (≤ 2 days): solid orange with **white** text.

### 4.8 Saison-Dashboard additions (`Saison-Dashboard (Staff).dc.html`)

- KPI row becomes `grid-cols-4`: Überfällig · **Angefochten** (new; alert
  variant like Überfällig when > 0, grey-zero otherwise) · Offen diese
  Woche · Freewins offen.
- New section **Angefochten** between Überfällig and Freewins: row in a
  destructive-tinted card — group tag, pairing, **Prüfen** button
  (outline, destructive text) → match page / resolve dialog (§4.4); second
  line indented `pl-[110px]`: quoted reason — „{reason}" — {name}.
- Below it: **„Erledigte Anfechtungen ({n})"** + action link **Anzeigen**
  (collapsed by default).
- Section-visibility rule from SAISON-DASHBOARD.md §4 applies (count 0 → 
  section absent).

### 4.9 Auf- & Abstieg is a dialog (`Auf- & Abstieg (Staff).dc.html` — rebuilt)

The old full-page stepper design is **withdrawn**; production's dialog is
correct and this file is its polished spec:

- Modal ~1080px over the dimmed seeding workspace. Title **Auf- und Abstieg
  festlegen** + explainer (Abstiege/Aufstiege benachbarter Divisionen müssen
  sich decken).
- Per division card: head (tick M navy + **Division {n}** + meta „{g}
  Gruppen · 8 / 7 / … Spieler") + **Maßgebliche Tabelle** toggle
  (Gruppentabelle/Gesamttabelle, active navy pill, white text).
- **Zonen-Vorschau**: chip row 1…{groupSize}, 40×34px, colored per §2.9
  from the counter values, grey otherwise.
- **Counters** (Meister-Playoff / Abstiegs-Playoff / Direkter Abstieg; for
  lower divisions Direkter Aufstieg / Aufstiegs-Playoff; lowest division
  shows „Unterste Division — kein Abstieg" instead of demotion counters):
  color swatch 10px + label 12px uppercase + −/+ stepper (34px buttons) +
  „× {g} Gruppen = {n} gesamt". Center: „{n} Plätze Klassenerhalt".
- **Balance row** between adjacent divisions: „↓ {n} steigen ab" (red) +
  chip **✓ Ausgeglichen** (green tint) / **✕ Nicht ausgeglichen**
  (destructive) + „↑ {n} steigen auf" (green).
- Footer strip: status icon + „Regeln gültig — nach dem Speichern kann die
  Einteilung finalisiert werden." (or the mismatch message) + **Schließen**.

### 4.10 Divisions-Einteilung workspace (`Divisions-Einteilung.dc.html`)

- Header gains the **Auf- & Abstieg** entry point: outline button with
  status dot (8px; orange = konfiguriert, grey = offen) → dialog §4.9.
- Terminology aligned to production: **Finalisieren / Einteilung
  finalisieren? / Finalisiert — endgültig** (was „Veröffentlichen").
  Type-to-confirm phrase: **„Saison {n}"**.
- Gate state (registration still open) uses the §2.8 card instead of a bare
  sentence.

### 4.11 Legal pages (`Legal.dc.html` — new)

Container 760px, h1 40px. Prose spec: h2 condensed 20px navy uppercase
(`mt-6`), body 14.5px `leading-[1.65]` muted, lists `gap-1.5 pl-5`, inline
links blue per §2.7 (currently orange). **Drop the „← Zur Startseite"
back link** — header logo + footer cover it; no page-specific special case.
Impressum content unchanged; Datenschutz keeps all 11 sections in this
prose pattern.

### 4.12 Staff-Bereich pre-season (`Staff-Bereich.dc.html`, screens 2a–2d)

Mostly consistency: „Anmeldung öffnen" primary 38px white text; dialog
confirm disabled per §1.2; type-to-confirm **„Saison 1"**; status ticks S;
section heads per §2.3; header nav per §3. Player-chip grid: chip height
36px, avatar fallback initials in `avatarFg`.

---

## 5. Small per-view fixes (P2 — one line each)

- **Liga-Übersicht**: short group-pill labels (§4.5); identical meta both
  section heads; zone palette §2.9.
- **Spieler-Dashboard**: „Ansehen →" as action link; hero right-half height
  stable; urgent chip white text.
- **Staff-Bereich (Saison)**: „Divisionen"/„Spielplan" as outline buttons;
  h1 margin `mb-9` in both phases; KPI alert tint only when value > 0.
- **Seeding gate state**: §2.8 card instead of bare sentence.
- **Match result meta line**: separators („·") in `text-border`, not muted.
- **Ergebnis anfechten**: outline + destructive text (escalation), not
  neutral.
- **Legal**: links blue; back link removed (§4.11).
- **Dialogs**: disabled confirms per §1.2 (Anfechtung senden, Spielplan
  erstellen, Anmeldung öffnen).
- **Footer**: inner max-width follows the page container (§2.5).
- **Landing credit**: ticks 18×9, tracking stays 0.16em.

---

## 6. Mobile & responsive (repeat of the banner — it matters)

The `.dc.html` files carry **no responsive behavior**. Implementation rules:

- Benchmark = the responsive behavior of already-shipped views (the mobile
  screenshots in the matrix are good; don't regress them).
- Two-column layouts (Liga-Übersicht, Spieler-Dashboard, Teamsheets,
  veteran field grid, Profil handles) stack at `lg` / `sm` as appropriate.
- Pill/switcher rows wrap (`flex-wrap`), never scroll horizontally.
- Sticky report bar: full-width, summary above button if needed,
  safe-area padding.
- Auf-&-Abstieg dialog: counters wrap to 2 columns, zone chips shrink to
  32px, dialog becomes full-screen sheet under 640px.
- Seeding workspace keeps its existing `MobileWarning` — out of scope.
- Hit targets ≥ 44px; the 27–30px pills get `py` padding via the row, keep
  a ≥ 40px touch box.

## 7. Dark mode

Everything resolves via the shadcn tokens in `globals.css`; the design files
are light-mode references. Per-view dark check after implementation —
specific watchpoints: zone tints (/7–/10 alphas on dark navy), the staff
panel navy tint (`dark:bg-muted/20` fallback per SAISON-DASHBOARD.md §9),
edge-state card borders, solid-orange chips (white text holds in both
modes), dialog backdrops.

## 8. Data edge cases

Long names truncate (`truncate min-w-0` on every name cell); 0 Anmeldungen /
empty Spieltage / missing avatars render the designed empty states, never
blank; name fallback per §1.3; `tabular-nums` on every count, score and
date column.

## 9. Accessibility

Orange focus ring (`--ring`) intact on all new controls; switchers/pills get
`aria-pressed`; dialogs trap focus, close on Escape + backdrop; small
white-on-orange labels ≥ font-weight 600; zone information is not
color-only (legend text + rail position).

## 10. Copy rules

„Freewin" never „Freigewinn" (SAISON-DASHBOARD.md); „Finalisieren" never
„Veröffentlichen" for the seeding (§4.10); button labels without ellipsis
unless they open a dialog (`docs/decisions/button-labels-no-ellipsis.md` +
SAISON-DASHBOARD.md §7 convention: dialog-opening labels end with „…").

## 11. What was deliberately NOT changed

- Seeding workspace interaction model (drag, bulk bar, lock/control) — 
  consistent, keep.
- Public overview information architecture — production got it right;
  §4.5 is a lock-in, not a rework.
- Dialog framework/patterns (create schedule, open registration) — only
  the disabled-button spec applies.
- `dev/`-Routen — internal, no design pass; just ensure they are not
  linked from production UI.

## 12. File map (canonical design references)

| View / Route | File |
|---|---|
| Landing `/` (pre-season) | Landing.dc.html |
| Liga-Übersicht `/` (in season) | Liga-Übersicht (Public).dc.html |
| Anmeldung `/anmeldung` | Anmeldung.dc.html (1a–1e) |
| Profil `/profil` | Profil.dc.html |
| Spieler-Dashboard `/spieler` | Spieler-Dashboard.dc.html |
| Tabellen-Modi im Dashboard | Divisionstabelle (Spieler).dc.html |
| Match `/match/[id]` (alle Rollen) | Ergebnis melden.dc.html |
| Staff-Bereich `/staff` (Vor-Saison) | Staff-Bereich.dc.html (2a–2d) |
| Staff-Bereich `/staff` (Saison) + Match-Staff | Saison-Dashboard (Staff).dc.html |
| Seeding `/staff/seeding` | Divisions-Einteilung.dc.html |
| Auf- & Abstieg (Dialog) | Auf- & Abstieg (Staff).dc.html |
| Spielplan-Dialog | Spielplan-Erstellung.dc.html |
| Impressum / Datenschutz | Legal.dc.html |
| Gesamtspec als Dokument | Polish-Katalog.dc.html |

## 13. Checklist

1. **P0**: sticky-bar fix (§1.1) · disabled-button rule as a shared Button
   concern (§1.2) · name fallback (§1.3)
2. `DESIGN.md` updated with §2 (white-on-orange, ticks, section header,
   titles, containers, labels, links, empty-state card, zone palette)
3. Shared pieces first: section-header component (§2.3), empty-state card
   (§2.8), tick component with S/M/L, link styles (§2.7)
4. Header/nav (§3)
5. Redesigns §4.1–4.12 in visibility order, each against its `.dc.html`
   incl. all Tweaks states, **with own mobile adaptation** (§6)
6. Detail fixes §5
7. Copy sweep (§10), dark-mode pass (§7), edge cases (§8), a11y (§9)
8. Regenerate the screenshot matrix (all phases × roles × themes ×
   viewports) and diff against the design files — same method as this
   audit; hand the matrix back for design sign-off
9. `npx biome check --write .` · `npx tsc --noEmit` · `npm test -- --run`
