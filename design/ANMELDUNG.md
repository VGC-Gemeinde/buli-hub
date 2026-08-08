# Buli Hub — Anmeldung (design handoff, iteration 4)

Companion to `DESIGN.md` (tokens, fonts, signature elements — all still valid),
`SIGNED-IN.md` and `STAFF-BEREICH.md`. This doc is the design pass over the
registration feature against current `main` (3679129): the `/anmeldung` shell,
the form controls, the confirmation view, and the edge states. Domain logic
(`registration.ts`, queries, actions) is correct as-is; only views change.
Reference design: project file "Anmeldung.dc.html" (1a new player, 1b veteran,
1c detected returner, 1d confirmation, 1e edge states).

`ProfileHint` already matches the design — keep it unchanged.

---

## 1. Shell — season + deadline always visible (`anmeldung/page.tsx`)

The page never leaves the player guessing what they are registering for and
until when. `Shell` gains a status line directly under the h1 and therefore
needs `window`/`state` passed in:

```tsx
<h1 className="mb-2.5 text-4xl text-brand-blue dark:text-white">Anmeldung</h1>
<div className="mb-9 flex items-center gap-2">
  <div className={cn("h-2 w-4 -skew-x-[18deg]", state === "open" ? "bg-brand-orange" : "bg-border")} />
  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
    {statusLine}
  </span>
</div>
```

`statusLine` per state (datetime `de-DE`, `15.08.2026, 20:00` style —
`dateStyle: "short"` + `timeStyle: "short"`):

- `open` → `Saison 1 · Läuft bis {closesAt}` (orange tick)
- `closed` → `Saison 1 · Geschlossen` (gray tick)
- `not_started` / no window → `Noch nicht geöffnet` (gray tick)

Message copy updates:

- signed out: unchanged text, but the status line above it shows the running
  deadline as incentive; `SignInButton size="lg"` stays primary.
- closed: `Die Anmeldung ist geschlossen. Die nächste Chance kommt — schau im
  Discord vorbei.`
- not_started: unchanged.

## 2. Form controls (`registration-form.tsx`)

Field stack: `gap-8` (unchanged). Anzeigename block unchanged.

### Card radios (Plattform + Teilnahme-Frage)

Bare `RadioGroupItem` rows become card-sized tap targets. Wrap each option in a
`<label>` styled as a card; the Radix item stays inside for state + a11y:

```tsx
<RadioGroup className="grid grid-cols-2 gap-2" ...>
  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 px-3.5 has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/5">
    <RadioGroupItem value="showdown" />
    <span className="text-sm font-medium">Pokémon Showdown</span>
  </label>
  ...
</RadioGroup>
```

- Plattform: full-width two-column grid.
- "Hast du schon einmal teilgenommen?": identical pattern and full width —
  same two-column grid as Plattform.
- Checked state: `border-brand-orange` + `bg-brand-orange/5` on the card; the
  Radix indicator dot is orange via `--primary` already.

### Veteran history (the "Ja" branch)

The four fields move from a long single column into a labeled 2×2 grid:

```tsx
<div className="grid gap-2">
  <div className="flex items-center gap-2">
    <div className="h-[7px] w-3.5 -skew-x-[18deg] bg-brand-orange" />
    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      Deine bisherige Teilnahme
    </span>
  </div>
  <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-4">
    {/* Letzte Saison · Damaliger Name · Division · Platzierung — Label + Input each */}
  </div>
</div>
```

### Skill slider (the "Nein" branch)

Value moves out of the label text into a right-aligned readout:

```tsx
<div className="flex items-baseline justify-between">
  <Label htmlFor="skill">Wie schätzt du dein VGC-Niveau ein?</Label>
  <span className="text-sm font-semibold text-brand-blue dark:text-white">{skillSelfRating}/10</span>
</div>
```

Slider + legend line unchanged (orange range comes from `--primary`).

### Erfolge-Textarea

Add a placeholder: `Turniere, Platzierungen, Momente, auf die du stolz bist …`

### Detected returner note

`Willkommen zurück! Wir haben deine bisherige Teilnahme erkannt — mehr als
Plattform brauchen wir nicht von dir.` (explains *why* there are no further
questions). Position: above the Anzeigename block.

### Submit

`size="lg"`, below it reassurance microcopy, `text-[13px] text-muted-foreground`:
`Du kannst dich bis zum Anmeldeschluss jederzeit wieder abmelden.`

## 3. Confirmation (`registration-confirmation.tsx`, `withdraw-button.tsx`)

Header card follows the season-card pattern from `STAFF-BEREICH.md` §3:

```tsx
<div className="rounded-lg border px-6 py-5 flex flex-col gap-2">
  <div className="flex items-center gap-3.5">
    <p className="font-heading font-bold text-2xl uppercase tracking-[0.02em] text-brand-blue dark:text-white">
      Du bist angemeldet
    </p>
    <div className="flex items-center gap-2">
      <div className="h-2 w-4 -skew-x-[18deg] bg-brand-orange" />
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Saison 1</span>
    </div>
  </div>
  <p className="text-muted-foreground text-sm">
    Deine Anmeldung ist eingegangen. Alles Weitere erfährst du im Discord.
  </p>
</div>
```

- Summary `Row`s unchanged (only answers actually given — existing behavior).
- Withdraw moves under a divider so it reads as a calm secondary action, with
  the deadline as context (pass `closesAt` down):

```tsx
<div className="mt-2 flex flex-col gap-2 border-t pt-5">
  <WithdrawButton />  {/* outline "Abmelden", unchanged behavior */}
  <p className="text-[13px] text-muted-foreground">
    Möglich bis zum Anmeldeschluss am {closesAt}.
  </p>
</div>
```

Rendered only when `canWithdraw` (existing).

## 4. Checklist

1. `anmeldung/page.tsx`: pass window/state into `Shell`, status line + copy (§1)
2. `registration-form.tsx`: card radios, veteran grid, slider readout, textarea
   placeholder, returner note, submit microcopy (§2)
3. `registration-confirmation.tsx` + `withdraw-button.tsx`: header card,
   divider + deadline hint (§3)
4. Verify both modes, `npx biome check --write .`, `npx tsc --noEmit`,
   `npm test -- --run`
