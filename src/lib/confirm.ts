// Type-to-confirm gate: the user must type an exact phrase to enable a
// destructive or irreversible action. The phrase names the action being
// committed to, so each gate passes its own (e.g. "Anmeldung öffnen",
// "Einteilung finalisieren"). Trimmed, case-sensitive exact match.
export function matchesConfirmationPhrase(
  input: string,
  phrase: string,
): boolean {
  return input.trim() === phrase;
}
