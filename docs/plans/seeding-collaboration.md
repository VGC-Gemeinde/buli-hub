# Seeding collaboration guardrails

**Status: done** (2026-07-03)

Division seeding is the platform's densest staff task and it is never done by one
person alone: the whole staff meets, one person shares their screen on Discord
and drives the UI while the group discusses. Two guardrails make that format
safe:

1. **Mobile warning** — the page needs a large screen (it is `min-w-[1520px]`
   by design). A confirmable notice on small viewports states this plainly
   instead of letting someone fight an unusable layout.
2. **Controller lock** — only the person driving can edit; everyone else opens
   the page as a read-only observer. Prevents a second staff member from
   silently clobbering the meeting's work.

Both ship in one commit (one coherent feature: collaboration guardrails).

## Out of scope

- **Live content sync** for observers. The Discord stream already _is_ the live
  view; observers see edits there. A lock-status poll (below) is the only
  liveness — enough to make takeover work, nothing more.
- Real-time co-editing / conflict resolution. Wrong tool: nobody edits
  simultaneously in this format.

## Mobile warning

Client component on `/staff/seeding`. On mount, `matchMedia("(max-width: 1023px)")`
(viewport size, not user-agent — the honest signal is "screen too small"). If it
matches and the session has not already acknowledged, open a dialog: the page is
built for large screens and is normally shared by one person; usable only in a
limited way here. Single acknowledge button; dismissal stored in `sessionStorage`
so navigation within seeding does not re-nag. Blocks no content.

## Controller lock

### Model

The page opens **read-only for everyone**. One person clicks **„Steuerung
übernehmen"** (with confirmation) to become the controller; while their lock is
fresh, every mutation by anyone else is rejected server-side. This reuses the
existing `readOnly` prop: `readOnly = finalized || !isController`.

Stale-lock handling is the load-bearing part: a crashed or slept tab must not
brick the meeting. So the lock carries a **heartbeat**; a lock whose heartbeat is
older than the TTL is treated as free. A fresh lock held by someone else can
still be **taken over** with a confirmation (the room is a trusted call —
takeover should be easy but deliberate).

- **TTL 60s, heartbeat every 20s** (three missed beats ⇒ free).
- **Takeover: any staff+**, gated only by a confirmation dialog.
- **Auto-init moves behind the lock**: an observer opening an un-set-up seeding
  no longer triggers initialization; only the controller does.
- Explicit **„Freigeben"** releases immediately; a closed tab falls back to the
  TTL. No `beforeunload` release (server actions are not beacon-friendly; the
  TTL is the boring, reliable path).

### Schema

New table (separate from `seedings`, because a `seedings` row need not exist when
the first person takes control — `sub_division_size` is `NOT NULL`):

- `seeding_locks` — `window_id` PK/FK → `registration_windows` (cascade),
  `holder_id` uuid FK → `auth.users` (cascade), `acquired_at`, `heartbeat_at`.
  Custom migration: FKs + `enable row level security` with no policies
  (server-only, like the sibling seeding tables).

### Pure logic (`control.ts`, exhaustively unit-tested)

- `isLockFresh(lock, now, ttlMs)`.
- `deriveControlState({ lock, currentUserId, now, ttlMs })` →
  `"free" | "self" | "held-by-other" | "stale"`. Cases: no lock, mine-fresh,
  other-fresh, mine-stale, other-stale, TTL boundary.
- Constants `CONTROL_TTL_MS`, `CONTROL_HEARTBEAT_MS`.

Client contract: `isController = state === "self"`; force needed iff
`state === "held-by-other"`; `free`/`stale` are takeable without force.

### Queries

- `getLockWithHolder(windowId)` — lock row + holder `displayName` (join
  `profiles`), or null.
- `upsertLock(windowId, holderId)` — set holder, `acquired_at`/`heartbeat_at` =
  now (on conflict update).
- `bumpHeartbeat(windowId, holderId)` — refresh `heartbeat_at` where holder
  matches.
- `releaseLock(windowId, holderId)` — delete where holder matches.

### Server actions

- `acquireControl({ force })` — staff+, closed, not finalized. `held-by-other`
  without `force` ⇒ rejected; otherwise upsert. Client refreshes → the existing
  auto-init effect (now gated on control) may fire.
- `pollControl()` — returns `{ state, holderName }`; bumps the heartbeat when the
  caller is the holder. Drives both the controller's heartbeat and observers'
  banner (holder changes / releases).
- `releaseControl()` — clears the caller's lock.
- **Enforcement**: `editableWindow()` gains a "caller is the current fresh
  holder" check, returning `code: "no_control"` on failure so the client flips
  to observer rather than only showing an error. `configureSeeding` and
  `assignToDivision` (which inlined their gate) are routed through
  `editableWindow()` so the check lives in exactly one place.

### Client

`seeding-workspace.tsx` gains `initialControlState`, `initialHolderName`,
`currentUserId`. A `ControlBar` renders the three states (observer+free →
„Übernehmen" confirm; observer+held → „{holder} bearbeitet gerade" + force
confirm; controller → „Du steuerst … Freigeben"). A single interval calls
`pollControl()` (20s): the controller heartbeats, an observer refreshes the
banner; losing control flips the UI to read-only. `readOnly` propagates to the
sheet, toolbar (config + finalize + generate), and bulk bar. `willAutoInit` is
gated on `isController`.

## Dev tooling

Gallery specimens for `ControlBar` (free / held-by-other / controller) and the
mobile + takeover dialogs. Existing personas (admin + staff) already provide two
control-capable accounts to exercise takeover; no persona change needed.

## Tests

- **Unit**: `control.ts` — `isLockFresh` boundary, `deriveControlState` all
  cases.
- **Integration**: acquire on free; blocked on fresh-other without force; force
  takeover; heartbeat bump keeps fresh; stale treated as free; release; window
  cascade removes the lock.
- **Manual/browser**: two accounts — observer read-only, take control, takeover,
  release, stale recovery; mobile warning on a narrow viewport.

## Resolved decisions

1. **Lock, not real-time sync** — one driver streams; simultaneous editing does
   not occur, so co-editing is the wrong tool.
2. **Separate `seeding_locks` table** — a `seedings` row may not exist at
   take-control time.
3. **TTL 60s / heartbeat 20s; takeover by any staff+ with confirmation.**
4. **No live content sync** — the Discord stream covers it; only lock status is
   polled.
