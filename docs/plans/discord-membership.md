# Discord-Server-Mitgliedschaft

Status: done.

Every player must be a member of the VGC Gemeinde Discord server — the
Regelwerk states it (Kapitel 1, "Wer darf mitspielen?"), all league
communication happens there. This feature enforces it: registration is gated
on membership, registered players who leave the server are locked out of
player actions until they rejoin, and staff can see and act on registered
non-members. The rule text itself is unchanged; enforcement is hub behavior.

## Data model

`profiles` carries a server-managed tri-state:

- `guild_member boolean` — `null` = never confirmed either way, `true`/`false`
  = last confirmed state. Written only by `syncMember`
  (`src/features/roles/sync.ts`) and the staff overview's roster sweep
  (`src/features/membership/sweep.ts`), both only when a lookup actually ran.
- `guild_member_checked_at` — when the state was last actually confirmed.
  Unlike `role_synced_at`, never bumped when the check could not run.

Write rules (covered by `sync.integration.test.ts`):

| Situation | `guild_member` |
|---|---|
| No role config (env missing, local dev) | untouched — sync is a no-op |
| Config, but no Discord id in the JWT | untouched (role/identity written) |
| Member found | `true` |
| Confirmed 404 | `false` |
| Discord API/network error (throws) | untouched; `getRole` falls back |

The flag piggybacks on the role sync's 5-minute TTL, so it is at most that
stale for anyone who touches the hub. `CurrentUser`
(`src/features/roles/guard.ts`) exposes it as `guildMember: boolean | null`.

**Fail-open on unknown, fail-closed only on a confirmed 404.** A missing
config, a missing Discord id, or an outage can never lock anyone out; only
Discord itself saying "not a member" does. A guild/bot misconfiguration
answers 403, which throws and therefore also fails open — a wrong config
cannot mass-flag the league. Deploy check: after changing `DISCORD_GUILD_ID`
or the bot, open `/staff` and sanity-check the membership counts and stamp.

The pure decision module is `src/features/membership/membership.ts`
(`isConfirmedNonMember`, `membershipBlock`, `bucketMembership`, the German
error constants). The invite link lives once, client-safe, in
`src/lib/discord-invite.ts`.

## Registration gate

`/anmeldung` shows a confirmed non-member the `MembershipBlockedCard`
(invite link + "Mitgliedschaft prüfen") instead of the form — after the
already-registered branch, so a registered player still sees their
confirmation and can withdraw. `register()` refuses with `MEMBERSHIP_ERROR`
between the already-registered check and validation; it resolves the caller
via `currentUser()` so the flag is TTL-fresh. `withdraw()` and
`dismissRegistrationHint()` are deliberately not gated: leaving the server
must not trap a player's data or their ability to withdraw.

A player who leaves the server seconds before registering can pass on a stale
`true`; the season gate and the action refusals catch them afterwards. Not
worth a forced sync in the hot path.

## Season gate

`SeasonGates` (`src/features/membership/components/season-gates.tsx`) is the
single gate mount on the season pages (`/spieler` twice, `/match/[matchId]`),
replacing the bare `RegelwerkPrompt` mounts. Precedence, deterministic and
never stacking: a player **registered in the current window** whose membership
is confirmed `false` gets the non-dismissible `MembershipGateDialog`
(invite link + "Ich bin beigetreten"); everyone else falls through to the
unchanged `RegelwerkPrompt`. Membership wins because rejoining is the
prerequisite for everything else; after a successful recheck the refresh
re-renders the mount and an owed Regelwerk gate appears next. A signed-in
non-member who never registered is just a visitor and sees no dialog. Mounted
per page, not in the chrome, for the same reason as `RegelwerkPrompt`.

`recheckMembership()` (`src/features/membership/actions.ts`) forces a
`syncMember` — deliberately not `getRole`, because the point is bypassing the
TTL right after the player joined — and revalidates the gated routes. A
failed sync never clears a stored `false`. No rate limiting: session-required,
one Discord call per click.

Server-side, `reportMatch` and `openDispute` refuse a confirmed non-member
with `MEMBERSHIP_ERROR` **before** `regelwerkBlock`, matching the dialog
precedence — the refusal names the gate the player is looking at. Any new
in-season player action must call both blocks, in that order. Deliberately
not gated: `acceptRegelwerk` (blocking it could wedge the two gates),
`withdraw`, profile settings, staff actions (staff act as officials).

## Staff overview + roster sweep

The "Discord-Mitgliedschaft" section (`MembershipList`,
`src/features/membership/components/membership-list.tsx`) renders on `/staff`
in both the pre-season and the running-season layout, whenever a window
exists — the page sweeps and queries the roster once and feeds both the list
and the warning card. It lists registered players
who are confirmed non-members ("Nicht auf dem Server") or never checked
("Noch nicht geprüft") — two distinct buckets, because one is a fact and the
other an admission. The header stamp is the oldest `guild_member_checked_at`
on the roster: everyone confirmed was checked at least since then.

Every load of `/staff` re-checks the whole roster (`sweepGuildMemberships`,
`src/features/membership/sweep.ts`): one paginated call to the guild members
*list* (`fetchGuildMemberIds`), compared against the registered players'
Discord ids, written back in one upsert. No TTL — the check is one API call,
so the list is simply always current when the page renders; the small refresh
icon next to the stamp (`RefreshListButton`) just re-renders the route, which
re-runs the sweep.

As long as the swept roster contains confirmed non-members, the top of the
dashboard carries the `MembershipWarningCard` (todo-card anatomy, orange, in
both layouts): the count, the ask to clarify with the players, and a
same-page anchor to the list. Never for merely unchecked players — the card
states a fact, the list carries the admission.
The list endpoint requires the privileged **Server Members Intent**, which is
enabled on the bot for this (the per-player role sync and the player-facing
recheck keep using the intent-free single-member lookup; see
docs/plans/discord-roles.md).

The sweep follows the same write rules as `syncMember`: the whole list is
fetched before anything is written, and any API error — notably the 403 of a
bot without the intent — aborts without a write, so a partial page or an
outage can never flag the league as gone; the stored flags render as-is and
the stamp shows their age. Players without a Discord id cannot appear in the
list, stay untouched and remain visibly unchecked. The sweep is also the
backfill for players who registered before membership was tracked — and
writing `false` arms the hard gate for those players on their next visit,
which is intended.

## Staff cancel of a registration

`cancelRegistration` (`src/features/registration/staff-actions.ts`, staff
only) removes another player's registration — the primary case being a
registered player who is not on the server. Allowed **only** in season phase
`registration_closed`; the pure gate `cancellationBlocked`
(`src/features/registration/cancellation.ts`) refuses every other phase with
a reason. While the window is open players withdraw themselves; from the
finalized seeding onward removal goes through the drop flow —
`finalizeSeeding()` stays one-way, there is no unfinalize.

Semantics mirror `withdraw()`, plus one thing `withdraw()` never faced: a
*draft* seeding may already hold a placement for the player, and schedule
generation reads placements alone, so the cancel also deletes the placement
(`removePlacement`, `src/features/seeding/queries.ts`) — otherwise a ghost
player would enter the Spielplan. Delete order: placement → acceptance →
registration, so an interruption leaves a retryable state. The deletes are
idempotent; no transaction, matching `withdraw()`.

The phase is derived at action time exactly as the staff dashboard derives it
(TOCTOU against a concurrent `finalizeSeeding()` is accepted: seeding is a
live staff session behind the seeding lock, and the deletes stay
self-consistent). A cancelled player cannot re-register while the window is
closed; only reopening the registration changes that. The registration
answers are gone for good — hence the type-to-confirm dialog
(`CancelRegistrationDialog`), unlike the revertable drop, and no reason field,
since a deleted row has nothing to attach it to.

UI: the dialog is always for a given player (no picker — the lists around it
already are the picker) and appears in two places, only in
`registration_closed`: on each non-member row of the membership section, and
as the staff panel on the public player profile (`ProfileCancelPanel`, same
anatomy as the drop panel that takes its place once the player is placed in
the running season — so the profile always offers the one removal that fits
the phase). The Anmeldungen `PlayerGrid` stays untouched (an avatar-chip grid
with no row affordance surface). The phase derivation shared by the staff
dashboard, the cancel action and the profile page lives in
`windowSeasonPhase` (`src/features/staff/queries.ts`).

## Dev tooling

- Persona `kein-server` (role `player`, `guildMember: false`) sees the gate
  and the blocked card everywhere; `leer` carries `guildMember: null` (the
  fail-open state). `pinPersonaProfile` writes the flag alongside the
  far-future `roleSyncedAt`, so the TTL never overwrites it.
- Impersonation is deliberately unchanged: membership does not help finding a
  user, and impersonating a non-member demonstrates the gate live.
- `/dev/ui` carries the gate body (closed-Dialog trick), the blocked card,
  the staff list in both states, and the cancel dialog.
- Local caveat: with real Discord env set locally, opening `/staff` would
  sweep the personas' fake snowflakes to non-members. Not guarded;
  `roleConfig()` is null in normal local dev, which makes sync and sweep
  no-ops.

## Known edge states

- A user with no Discord id in the JWT is permanently `null`: never gated,
  never blocked, visible to staff as "Noch nicht geprüft".
- A leaver keeps acting for up to the 5-minute TTL (same trust window as
  roles); a rejoiner un-gates instantly via the recheck button.
- During an outage a stored `false` cannot be cleared (recheck reports
  failure, never clears); the player waits out the outage.
