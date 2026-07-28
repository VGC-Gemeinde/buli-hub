import { FinalizeDialog } from "buli-hub";

/* The last gate of the Divisions-Einteilung: finalizing writes the divisions and
 * groups for good, so it is a type-to-confirm dialog rather than a plain „Sind
 * Sie sicher?". The confirmation phrase is the season name itself, and
 * „Finalisieren" stays disabled until it is typed exactly.
 *
 * The dialog is fully controlled (the step bar's gated button owns `open`), so
 * the preview passes `open` directly — there is no trigger and no `defaultOpen`.
 * cfg.overrides gives it cardMode:"single" + a 720x520 viewport because the
 * content renders in a portal.
 *
 * One cell only: the typed-phrase state and the server-error state both live in
 * the component's own `useState` and have no prop to reach them, so the opened
 * dialog with an empty (still disabled) confirmation is the whole statically
 * renderable surface. Ported from the dev/ui gallery („Einteilung:
 * Finalisieren"). */

export function Bestaetigung() {
  return (
    <FinalizeDialog
      season="Saison 9"
      open
      onOpenChange={() => {}}
      onConfirm={async () => ({ ok: true })}
    />
  );
}
