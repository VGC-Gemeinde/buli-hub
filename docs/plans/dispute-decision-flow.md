# Anfechtung entscheiden: one flow, only sensible states

**Status: done**

## Problem

„Entscheiden" promised a decision but only wrote the dispute row. Correcting a
result meant leaving the dialog, using „Ergebnis bearbeiten", reopening the
dialog and remembering to pick „Als korrigiert markieren" — and nothing tied the
two together. The reachable nonsense states were real: edit the result and then
resolve as „bestätigt", or resolve as „korrigiert" without touching anything.
The note that was supposed to record the reasoning was optional and never
displayed anywhere.

## Shape

**One decision, one transaction.** The dialog carries every correction path
staff can take on a disputed match, and the result change plus the dispute
resolution are written together:

| Entscheidung | Result change | `resolution` |
| --- | --- | --- |
| Ergebnis bestätigen | none (a *pending* free win is confirmed) | `upheld` |
| Ergebnis korrigieren | `replace` from the inline editor | `corrected` |
| Freewin vergeben | `replace` with a free win (note = `free_win_reason`) | `corrected` |
| Doppelniederlage vergeben | `replace` with a double loss | `corrected` |
| Ergebnis zurücksetzen | `delete` (match is re-reportable) | `corrected` |

Consequences that make the guarantee hold:

- **While a dispute is open the staff panel shows only the decision.** Edit,
  reset, award and free-win-confirm rows are hidden — they are all reachable
  *inside* the decision, so there is no second path that could desynchronize
  result and dispute.
- **Upholding a pending free win confirms it.** „Das Ergebnis bleibt bestehen"
  has to mean it counts, otherwise staff would have to step out again.
- **The explanation is mandatory** („Erkläre deine Entscheidung"), and it is
  shown to both players on the match page, so it is worth writing.

## Flow (two steps, one modal)

1. **Entscheidung** — the contested result and the quoted dispute for context,
   then the five options as cards. „Weiter".
2. **Details + Begründung** — the chosen decision with a „Ändern" affordance,
   the fields that decision needs (result editor / winner picker / nothing), and
   the mandatory explanation. Submit label names the consequence.

Nothing is written before the last button; „Zurück" keeps every entry.

## Code

- Pure (`dispute.ts`, `result-draft.ts`, unit-tested): `disputeChange(decision,
  current, note)` → `{ resolution, change }` over
  `keep | confirm | replace | delete`; the result-editor draft helpers
  (completeness, best-of-3 third game, draft → report payload) extracted from
  the editor component so both it and the dialog share them.
- Action: `decideDispute({ matchId, decision, note })` replaces
  `resolveDispute` — staff gate, mandatory note, `staffResultSchema` for the
  edit path, participant check for the free-win path, then one call into
  `resolveDisputeWithChange`, which applies result change + resolution in a
  single transaction. Revalidates and syncs the Discord result post (a decision
  can now change the public result).
- UI: `dispute-resolve-dialog.tsx` (the flow), `result-fields.tsx` (shared
  editor fields, also used by `staff-result-editor.tsx`), panel switches to
  decision-only while disputed.
- Aftermath: the match page shows the resolved decision + explanation to
  participants and staff; the staff dashboard's resolved list shows the note.

## Tests

Unit: every decision × current-result combination in `disputeChange`, note
validation, draft helpers. Integration: `resolveDisputeWithChange` for replace /
delete / confirm — result and dispute both land, and the dispute is closed.
