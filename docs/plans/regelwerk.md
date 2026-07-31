# Regelwerk — public rules document and per-season acceptance

Implements `design/REGELWERK.md` (hand-off, iteration 1). That doc owns every
visual decision; this plan owns scope, schema, and the server work it names but
deliberately leaves open.

Built in two slices — the document first, with no schema, then acceptance and
the action-lock on top. They ship as one commit: the second slice reshaped the
first's views (the document grew a status line, the page an acceptance read), so
splitting them after the fact would produce a first commit that never existed.

**Status: done.**

## Scope

**In**

- Public route `/regelwerk` rendering the Saison-9 rules in full, for the
  running season, readable signed out.
- Entry points: footer link, acceptance checkbox on `/anmeldung`, side card on
  the Spieler-Dashboard.
- Per-season acceptance record, written at registration or from the prompt.
- Reminder dialog (registration open) and gate dialog (season running).
- Server-side enforcement: an unaccepted player cannot take player actions.
- `/dev/ui` gallery states and a `/dev` reset so the prompts stay reachable.

**Out**

- Staff-editable rules content. The text is hardcoded (see Decisions).
- Any consequence for never accepting beyond the action-lock: no
  „Regelwerk offen" staff list, no effect on seeding, no chased deadline.
- Rules history / diffing across seasons. `/regelwerk` serves the running
  season only.
- Acceptance for staff-only actions. Staff act as officials, not as players.

## Decisions

1. **Content is hardcoded per season**, as structured TypeScript under
   `src/features/regelwerk/content/`. Changes ship as a commit, versioned in
   git. The four pull-outs (§2.7) are bespoke layouts per rule and could never
   come out of a generic editor, so a CMS would only ever cover the prose half
   while adding a schema, an editor and a sanitised render path.
2. **Acceptance is a row per season**, not a boolean on the profile. Saison 10
   requires a fresh acceptance, and last season's must not unlock this one. The
   timestamp costs nothing and is shown back to the player so they can see they
   are done.
3. **The action-lock is the only consequence.** A player who never accepts stays
   registered and is seeded normally. Nothing chases them, nothing is listed for
   staff, seeding is untouched. They simply cannot act until they confirm.
4. **Read-only is never gated.** Tables, Spielplan, upcoming matches, results,
   player profiles all stay open to an unaccepted player. Only mutations are
   blocked — a player who can still see the table reads the rules; a player who
   sees nothing writes to the Orga.
5. **Registrations that predate acceptance stay valid.** Registration is already
   open for Saison 9, so registered players exist who never saw an acceptance
   step. They are „registered, not accepted" and get the reminder. Retroactively
   voiding a real registration for a step that did not exist is not defensible.
6. **Acceptance happens where the player is asked, never on the rules page.**
   `/regelwerk` is a document and carries no acceptance control. A player
   confirms in exactly two places: the checkbox on `/anmeldung`, which is part
   of registering, and the prompt dialog, which is the thing telling them
   something is outstanding. An unaccepted player on the rules page gets a
   button that opens that same dialog, so the page is a way *in* to accepting
   without being the place it happens.

   **This supersedes hand-off §4 and §5.3**, which put the control at the end
   of the document behind a checkbox and a sticky bar, on the reasoning that a
   player who can tick a box in a modal has not read the rules. The maintainer's
   call: we trust our players, and the record exists to answer „did they agree",
   not to prove they were on the page. A future session should not restore the
   inline block from the hand-off.
7. **One button, no confirmation checkbox in the dialog.** The dialog's copy
   already says what is being confirmed. The `/anmeldung` checkbox stays,
   because there it is one item in a form rather than the whole ask.

## Schema

One table, one migration, shipped in slice 2.

```ts
export const regelwerkAcceptances = pgTable(
  "regelwerk_acceptances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    windowId: uuid("window_id").notNull(),
    userId: uuid("user_id").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.windowId, table.userId)],
);
```

`windowId` → `registration_windows`, which is how every other per-season table
in this schema anchors a season (`seedings` does the same). The FK into
`auth.users` for `user_id`, the RLS policies and the grants go in a custom
migration, per the existing pattern.

The unique constraint makes acceptance idempotent: registering and then
confirming from a prompt is a no-op the second time, and the original
timestamp stands.

## Gate — which actions

„Player action" means a mutation a player performs as a participant of the
running season. Concretely, today:

| Action | File | Gated |
|---|---|---|
| `reportMatch` | `features/reporting/actions.ts` | yes |
| `openDispute` | `features/reporting/dispute-actions.ts` | yes |
| `register` | `features/registration/actions.ts` | no — it *is* an acceptance; gating it would be circular |
| `withdraw`, `dismissRegistrationHint` | `features/registration/actions.ts` | no — registration lifecycle, not play |
| `updateProfile` | `features/profile/actions.ts` | no — account settings, not a league action |
| `submitFeedback` | `features/feedback/actions.ts` | no — blocking it would block reporting the very problem |
| `createSchedule`, `resolveDispute`, everything in `staff/`, `seeding/`, `motw/`, `drops/` | — | no — staff act as officials |

A shared `regelwerkBlock()` guard in `src/features/regelwerk/guard.ts`, called
at the top of each gated action next to the existing `currentUser()` check,
returning either null or the same `{ ok: false, error }` shape those actions
already use. New in-season player actions call it too — noted in the feature's own
section of `CLAUDE.md` if the list grows.

The gate only applies while a season is running (`seasonPhase`), so a player
cannot be locked out of something that is not happening yet.

## Views

Per `design/REGELWERK.md` §2–§5; that document is authoritative for markup and
tokens. Structure:

```
src/features/regelwerk/
  content/saison-9.tsx    # the rules; structure as data, prose as JSX
  content/types.ts
  acceptance.ts           # pure: regelwerkPrompt(), actionsLocked()
  components/             # document, chapter list, the four pull-outs,
                          # status line, confirm button, both dialogs
  queries.ts              # acceptedAt(), recordAcceptance()
  actions.ts              # acceptRegelwerk()
  guard.ts                # regelwerkBlock()
src/app/regelwerk/page.tsx
```

Everything server-rendered except the chapter list (scroll-spy), the confirm
button and the dialogs.

Two traps the hand-off calls out and I will verify rather than trust:

- **Bullets.** The preflight sets `list-style: none` and no `.list-disc`
  utility is compiled; a `ul` that is also `display: flex` loses markers
  entirely. Adding a compiled `.list-disc` rule to `globals.css` is the better
  fix since lists will recur (§2.6).
- **The class vocabulary is finite.** Only classes already present in the repo
  compile. Anything new goes in as an inline style or copies an existing
  component's class (§7).

## Mobile

The hand-off is desktop-only and says so (§6). The adaptations are mine: the
sidebar collapses to a chapter list under the page head below `lg`, the tile
grids drop to two columns then one, the Spielwoche strip goes 4+3 or vertical
with the Mi highlight surviving, and the Nichtantreten timeline stacks.
Tap targets ≥44px on the chapter links and the registration checkbox row.

## Tests

Domain logic is thin here — the document is content — so the tests concentrate
on the gate, which is where being wrong is expensive:

- Unit: `requireAcceptance` — accepted, not accepted, not signed in, no running
  season, staff caller.
- Unit: content integrity — every chapter has an `id` matching the chapter list,
  so an anchor can never dangle.
- Integration: `acceptRegelwerk` writes one row; a second call is a no-op and
  does not move the timestamp; acceptance for Saison 9 does not satisfy a later
  window.
- Integration: `reportMatch` and `openDispute` refuse an unaccepted player and
  succeed once accepted.

## Definition of done

Slice 1 ✅: `/regelwerk` renders the full ruleset in both colour modes, footer
link, dashboard card, gallery states for the document's own components.

Two things slice 1 settled that the hand-off left to implementation:

- **Bullet markers.** The `ul` sets `list-style` inline and is never a flex
  container, both in one shared `Bullets` component (`components/prose.tsx`).
  `list-disc` does compile under Tailwind v4 — the marker-killer is the flex
  container, which is why `LegalPage`'s `[&_ul]:flex [&_ul]:list-disc` renders
  bullet-less lists today. Out of scope here, but worth fixing when those pages
  are next touched.
- **`SectionHeader` gained an opt-in `wrap`.** Its `truncate` is right for
  dynamic names in a fixed column, but turned „Ablauf des Ligabetriebs" into
  „Ablauf des Ligabet…" on a phone. Default behaviour is unchanged.

Slice 2 ✅: acceptance table + migration, checkbox on `/anmeldung` gating submit
and recording the acceptance, both dialogs carrying the confirm button, the
rules page's status line + reminder trigger, server enforcement with tests, and
the matching gallery states.

Three things slice 2 settled:

- **Registering is accepting.** The form gates its own submit on the Regelwerk
  checkbox, so reaching `register` means the player agreed — and `register`
  writes the acceptance row. That makes „since when" answerable for the whole
  field rather than only for players who later opened a prompt, and it leaves
  the dialogs covering exactly who they should: the Saison-9 players who
  registered before this feature existed. `register` does not re-verify the
  checkbox server-side; nothing is granted by ticking it, and the enforcement
  that matters is `regelwerkBlock`.
- **The prompts mount per page, not in the site chrome.** `RegelwerkPrompt`
  sits on `/spieler` and `/match/[matchId]`. In `SiteHeader` it would put the
  non-dismissible gate on `/regelwerk` itself, which is where a player goes to
  read what they are being asked to accept.
- **`/dev/regelwerk?accept=0` instead of a persona.** „Registered but
  unaccepted" is season state, not an auth-metadata shape, so it does not fit
  `personas.ts`. Acceptance is also one-way in the product, which would make
  each dialog reachable exactly once per developer per season; the dev route
  is what keeps them reachable.

Both: `npx biome check --write .`, `npx tsc --noEmit`, `npm test -- --run`.

## Open questions

None blocking. If the Orga later wants to edit rules without a deploy, decision 1
is the one to revisit — the content types are shaped so a loader could replace
the hardcoded module without touching the components.
