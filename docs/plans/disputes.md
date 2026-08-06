# Disputes + staff result editing

**Status: done**

## Context

Reported results are final on submit; the intended correction path was always
"if you disagree, dispute it" — but disputes were deferred. This feature adds
them, and with them two related improvements the maintainer asked for:

1. **Staff can fully edit a submitted result** (not just reset it). Staff never
   do the *initial* submission — players report — but once a result exists,
   staff can change anything in it. This is a general power that also becomes
   the natural "correct" path when resolving a dispute.
2. **The player dashboard hero surfaces this week's reported result** with quick
   access to the match, so a wrong report from the opponent is seen immediately.

## Dispute model (decisions locked)

- **Who opens:** either participant (usually the opponent contesting the
  reporter's result, but the reporter can flag their own mistake too — they
  can't edit results).
- **What:** any match that has a recorded result. One **open** dispute per match
  at a time; resolved ones are kept (for the history filter).
- **While open:** the result **still counts** in standings — it stands until
  staff act — but the match is **flagged disputed** everywhere it shows.
- **No time limit** to open one (staff-managed).
- **Resolution:** staff **uphold** (result stands) or **correct** (the result
  changed), recording who/when + a mandatory explanation. The decision and the
  result change happen together in one dialog — see
  `docs/plans/dispute-decision-flow.md`.

### Schema (`disputes`, custom FK/RLS migration)

`id`, `matchId` FK→matches (cascade), `openedById` FK→auth.users (cascade),
`reason` text, `openedAt`; `status` enum `open|resolved`; `resolution` enum
`upheld|corrected` (null while open); `resolvedById` FK→auth.users (set null),
`resolvedAt`, `note`. A log per match (multiple rows over time); a partial unique
index enforces at most one `open` per match, re-checked in the action. RLS on,
no policies (server-only).

## Staff full result edit

Adds full editing on top of the reset-only limitation. On any undisputed match
with a **normal** result, staff open an **„Ergebnis bearbeiten"** editor
pre-filled from the current result and change everything a normal result
carries: per-game winners + replays, platform, both team sheets, video.
Switching a result to a **free win** or **double loss** stays with the existing
award actions (`AwardFreewinDialog` / double-loss confirm), and **reset** (clear
→ re-reportable) stays — so the panel exposes edit + reset + the two award
overrides. Keeping the free-win path on the award dialog avoids the player-only
`discussedWithId` friction (staff need not name who they discussed with). On a
**disputed** match the panel hides all of these: every one of them is reachable
inside the decision dialog instead.

- **Reuse:** the editor validates through the shared `staffResultSchema`
  (`reportSchema` plus a staff-only `double_loss` variant) and `toResultRows`.
  Its fields live in `result-fields.tsx` (shared with the dispute decision) in a
  **neutral perspective** (player A vs player B, „Team {A}" / „Team {B}"), not
  the player's „Du" framing — separate from the design-passed `report-form` to
  keep risk low.
- **Action:** `editResult(input)` (staff+, result must exist) →
  `replaceResult` upserts `match_results` + games, setting `corrected_by`.

## Player-side

- **Match page:** when a result exists and the viewer is a participant with no
  open dispute → an **„Ergebnis anfechten"** action (dialog: reason). While a
  dispute is open → „Angefochten · in Prüfung" with the reason; once resolved →
  the decision (bestätigt / korrigiert) plus the staff explanation is shown.
- **Dashboard hero:** the reported and pending-free-win hero states link to
  `/match/[matchId]` (view + dispute). The result is already shown there; this
  adds the missing quick access.
- **Schedule + standings:** a disputed match shows an „Angefochten" marker
  alongside its result chip.

## Staff dashboard

Re-add the **Disputes** section (dropped in the design pass): open disputes
listed with the reason + who opened, linking to the match page; plus a
**resolved-history filter** (the original ask). `bucketMatches` gains a
`disputed` bucket; `windowMatchOverview` / `StaffMatchRow` carry the open-dispute
state (+ reason/opener for the section).

## Pure logic (unit-tested)

- Dispute display: a `disputed` flag folded into the match state (a reported
  result can also be disputed — orthogonal to `matchDisplayState`, carried
  alongside).
- The staff editor reuses `deriveSeries` / `reportSchema` (with the added
  `double_loss` variant) and `toResultRows` — extended, exhaustively tested.

## Queries / actions

- Queries: `openDispute` insert, `resolveDisputeWithChange` (result change +
  resolution in one transaction), `matchOpenDispute(matchId)` (the current open
  one), `matchResolvedDispute(matchId)` (the last decision, for the match page),
  `windowResolvedDisputes(windowId)` (history, newest first) for the section,
  and the open dispute joined into `windowMatchOverview` (staff worklist) and
  `subDivisionResults` (the schedule/standings `disputed` flag).
  `replaceResult` for the staff editor.
- Actions: player `openDispute({matchId, reason})` (participant gate, result
  exists, none open); staff `decideDispute({matchId, decision, note})` and
  `editResult(input)` (staff gate). `{ok}|{ok:false,error}`; revalidate the
  match + `/staff` + `/spieler`.

## Dev tooling & tests

- Seed: leave one match with an **open dispute** (and one resolved) so the staff
  dashboard's Disputes section is populated.
- Gallery: the dispute dialog, the „Angefochten" chip, the staff editor, and the
  dashboard Disputes section.
- Unit: dispute state derivation, extended report schema (double-loss).
  Integration: openDispute/resolveDispute/editResult round-trips + the
  one-open-per-match constraint. Manual: player disputes a wrong result; staff
  edit it and resolve.

## Delivery

Branch `feat/disputes`, squash-merged to main. Build order: schema+migration →
extend report schema (double-loss) + staff editor → dispute queries/actions →
player dispute UI + hero link → staff dashboard Disputes section + panel resolve
→ seed/gallery → checks.

## Open questions

None — scope is settled; a design hand-off for the new surfaces comes after the
functional build (two-pass workflow).
