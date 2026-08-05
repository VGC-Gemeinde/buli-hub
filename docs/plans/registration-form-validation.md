# Anmeldung: Formularvalidierung mit Fehlermeldungen

**Status: done** (2026-08-05)

Players reported that they could not submit their registration and could not
tell why. Reproduction: type `3b` into „Division" in the veteran-history block.
The submit button stays disabled and the form says nothing.

## Why it happens

Three separate defects stack up:

1. **`<Input type="number">` throws the input away.** Per the HTML value
   sanitization algorithm, a value that is not a valid floating-point number
   reads back as `""`. The player sees `3b` in the field, React state receives
   `""`. The field looks filled and is empty.
2. **The submit button is gated on a silent completeness check.**
   `canSubmit` requires every veteran field to be non-empty, plus a platform,
   plus the Regelwerk tick. Nothing renders when the check fails, so a disabled
   button is the only signal, and it names neither the field nor the reason.
3. **The Zod messages exist but never reach the player.** `veteranHistorySchema`
   has proper German messages; they are only used server-side, where every
   failure collapses into one generic „Bitte alle Felder zur Historie
   ausfüllen". The client never runs them at all.

There is also a latent fourth problem that would make a naive fix produce bad
copy: `z.coerce.number()` turns `""` into `0`, so an empty field reports
„Mindestens 1" rather than „Pflichtfeld", and `"1e2"` becomes `100` and reports
„Höchstens 30".

## Scope

In:

- Per-field validation with German messages for the whole form, not only the
  division field: platform, the participation question, all four veteran
  fields, and the Regelwerk acceptance.
- Submit button no longer gates on validity; it validates on click and reports.
- Visual + a11y treatment of the invalid state, designed as part of this change
  (no separate design pass).
- Shared client/server validation so the server answer is field-precise too.
- Unit tests over the validator, exhaustively.
- `/dev/ui` gallery entry for the error states.

Out:

- Changing what the veteran history *means* or how seeding consumes it.
- `prevSeason` stays free text (`text` column). See open questions.
- The confirmation and withdrawal views.

## Approach

### Schema: string-first instead of `z.coerce`

`registration.ts` gets an internal `integerField()` helper used by
`veteranHistorySchema`. Input stays a string (which is what the form and the
server action actually receive), output stays `number`, so `createRegistration`
and the DB columns are unaffected.

| input   | message                              |
|---------|--------------------------------------|
| `""`    | Pflichtfeld                          |
| `"  "`  | Pflichtfeld                          |
| `"3b"`  | Bitte nur Ziffern eingeben, z. B. 3  |
| `"3.5"` | Bitte nur Ziffern eingeben, z. B. 3  |
| `"1e2"` | Bitte nur Ziffern eingeben, z. B. 3  |
| `"-1"`  | Bitte nur Ziffern eingeben, z. B. 3  |
| `"0"`   | Mindestens 1                         |
| `"31"`  | Höchstens 30 (Division)              |
| `"3"`   | ok                                   |

### A pure validator

```ts
export function validateRegistration(input: RegistrationDraft): RegistrationFieldErrors
```

Pure function in `registration.ts`, returns a partial record keyed by field.
Runs the branch that `resolvePlayerStatus` resolves to, so a new player is never
asked for veteran fields and vice versa. Both the client and the server action
call it, which is what keeps the two from drifting.

### Input controls

`prevDivision` / `prevPlacement` become `type="text"` with `inputMode="numeric"`
so the keypad is still numeric on mobile but the typed text survives and can be
validated. This is the fix that makes `3b` reportable at all. It also drops the
spinner buttons and the scroll-wheel-changes-the-value behaviour, both of which
are liabilities in a form like this.

### Interaction model

Validate on submit, then live per field:

1. The button is enabled whenever a submit is not already in flight. A disabled
   button is exactly what caused this report; it is also invisible to screen
   readers as an error signal.
2. Click validates. If anything fails, nothing is sent, messages render, and the
   first invalid control is focused and scrolled into view.
3. After a field has been reported, it re-validates as the player edits, so the
   message disappears the moment it is fixed. Fields that were never reported
   stay quiet while typing.
4. A short line above the button („Bitte prüfe die markierten Felder.") makes
   the click feel answered even when the offending field is off-screen.

### Visual treatment

Messages use the existing `text-destructive` token at `text-[13px]
leading-snug`, matching the muted hint paragraphs already under these fields, so
the vertical rhythm does not change when one appears. `aria-invalid` is already
styled on `Input`, `Checkbox` and `RadioGroupItem`, so the control treatment
comes for free; the radio cards additionally get a destructive border. Each
message is wired via `aria-describedby`, `role="alert"`.

New shared component `src/components/field-error.tsx` so every future form
reports errors identically.

### Server parity

`RegisterResult` gains an optional `fieldErrors`. The action calls the same
validator and returns field-precise messages instead of one generic sentence.
The client merges them into its own error state.

## Test cases (`registration.test.ts`)

- `integerField` boundary table above, including `"3b"` as the reported case.
- Veteran branch: each field empty in isolation; all valid; whitespace-only.
- New-player branch: veteran fields ignored even when garbage.
- Detected returner: neither branch is required.
- Platform missing; participation question unanswered; Regelwerk not accepted.
- A fully valid draft in each of the three branches produces no errors.

## Drive-by

The em-dash sweep (2026-08-05) missed the registration area entirely: neither
sweep commit touched these files. Four user-facing strings still carry `—`
(`registration-form.tsx:97`, `anmeldung/page.tsx:137,151,182`) plus one in the
gallery demo copy. Fixed here since the change already edits these files.

### Slider: „not answered" is not 0

`skillSelfRating` becomes `number | null`, because 0 („blutiger Anfänger") is a
real answer that a player who skipped the question must not be given by
default. The readout says „noch keine Angabe" until the slider is used, and
submitting without it is an error.

„Used" cannot be inferred from the value changing: a player who wants 0 never
moves the thumb off it. So the answer is also recorded on `onPointerDown` and
on the keys that drive a slider, which is the only way choosing 0 deliberately
is expressible.

## Follow-up

The em-dash sweep is incomplete well beyond registration. Roughly 17 user-facing
German strings elsewhere (`app/page.tsx`, `datenschutz`, `settings-form`,
`season-dashboard`, the seeding views, `drops-section`, `staff/page.tsx`) plus 3
in `discord-posts/messages.ts` still carry `—`. Left for a separate copy commit
rather than mixed into this feature.

## Open question

**`prevSeason` is free text**, so „Saison 4", „4", „S4" and „2024" all pass and
land in the same `text` column. Only affects staff reading the roster by hand
today. A placeholder („z. B. Saison 4") is added as a nudge; constraining the
format is a domain decision, not this change.
