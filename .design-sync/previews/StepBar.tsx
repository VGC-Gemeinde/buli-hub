import { StepBar } from "buli-hub";
import { seedingSteps } from "@/features/seeding/steps";

/* The workflow strip of the Divisions-Einteilung — a full-width stepper row
 * that answers three different questions without mixing them up: the numbered
 * circles show *how far* (✓ done / number active / muted pending), the
 * highlighted segment shows *where you are* (inset orange bottom rule), and
 * step 4 spells out *what still blocks finalizing* inline instead of in a
 * tooltip. Steps 1+2 share the sheet segment, step 3 is the rules segment,
 * step 4 is deliberately not a segment — it must read as an action.
 *
 * `steps` comes from the real `seedingSteps()` progress model, so done/active/
 * pending is derived, never hand-set. Ported from the dev/ui gallery
 * („Einteilung: Schrittleiste"). */

const PROGRESS = {
  total: 42,
  placed: 42,
  grouped: 42,
  postSeasonConfigured: true,
  replayConfigured: true,
  finalized: false,
};

/* Start of the meeting: 12 of 42 registrations placed, no groups yet. Step 1 is
 * active, step 4 names its blocker. */
export function AnfangPlatzieren() {
  return (
    <StepBar
      steps={seedingSteps({
        total: 42,
        placed: 12,
        grouped: 0,
        postSeasonConfigured: false,
        replayConfigured: false,
        finalized: false,
      })}
      view="sheet"
      onViewChange={() => {}}
      rulesStatus={{
        configured: false,
        replayConfigured: false,
        dirty: false,
        noGroups: true,
        issueCount: 0,
      }}
      finalize={{
        finalized: false,
        ready: false,
        readOnly: false,
        gateShort: "Noch 30 platzieren",
        gateHint:
          "Erst möglich, wenn alle Spieler platziert (12/42) und in Gruppen (0/42) sind.",
        onOpen: () => {},
      }}
    />
  );
}

/* Everyone is placed and grouped, the rules view is open and the ladder still
 * has two open points — the sublabel warns in the same words the panel does. */
export function RegelnAnsicht() {
  return (
    <StepBar
      steps={seedingSteps({
        ...PROGRESS,
        postSeasonConfigured: false,
        replayConfigured: false,
      })}
      view="rules"
      onViewChange={() => {}}
      rulesStatus={{
        configured: false,
        replayConfigured: false,
        dirty: true,
        noGroups: false,
        issueCount: 2,
      }}
      finalize={{
        finalized: false,
        ready: false,
        readOnly: false,
        gateShort: "Auf- & Abstieg speichern",
        gateHint: "Erst die Auf- und Abstiegsregeln festlegen und speichern.",
        onOpen: () => {},
      }}
    />
  );
}

/* All three steps done and the viewer is driving: step 4 turns into the primary
 * „Finalisieren…" button. */
export function BereitZumFinalisieren() {
  return (
    <StepBar
      steps={seedingSteps(PROGRESS)}
      view="sheet"
      onViewChange={() => {}}
      rulesStatus={{
        configured: true,
        replayConfigured: true,
        dirty: false,
        noGroups: false,
        issueCount: 0,
      }}
      finalize={{
        finalized: false,
        ready: true,
        readOnly: false,
        gateShort: null,
        gateHint: "Endgültig — kann nicht rückgängig gemacht werden.",
        onOpen: () => {},
      }}
    />
  );
}

/* Ready, but somebody else holds the control lock — the action is replaced by
 * the reason it is unavailable, never by a disabled button. */
export function BereitAberBeobachter() {
  return (
    <StepBar
      steps={seedingSteps(PROGRESS)}
      view="sheet"
      onViewChange={() => {}}
      rulesStatus={{
        configured: true,
        replayConfigured: true,
        dirty: false,
        noGroups: false,
        issueCount: 0,
      }}
      finalize={{
        finalized: false,
        ready: true,
        readOnly: true,
        gateShort: null,
        gateHint: "Endgültig — kann nicht rückgängig gemacht werden.",
        onOpen: () => {},
      }}
    />
  );
}

/* Finalized: every circle is done, step 4 becomes the terminal chip and the
 * flow hint at the right end disappears. */
export function Finalisiert() {
  return (
    <StepBar
      steps={seedingSteps({ ...PROGRESS, finalized: true })}
      view="sheet"
      onViewChange={() => {}}
      rulesStatus={{
        configured: true,
        replayConfigured: true,
        dirty: false,
        noGroups: false,
        issueCount: 0,
      }}
      finalize={{
        finalized: true,
        ready: false,
        readOnly: true,
        gateShort: null,
        gateHint: "",
        onOpen: () => {},
      }}
    />
  );
}
