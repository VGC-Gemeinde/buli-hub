import type { TeamsheetSource } from "./sources";
import type { MonIcon } from "./view";

// The state behind one team sheet input, and the pure rules that govern it.
// Two surfaces edit a sheet the same way (the player's report form and the
// staff/dispute result editor), and the form needs to know at every keystroke
// whether the whole report is submittable — so this lives outside the
// components and is unit-tested.

export type AcceptedSheet = {
  source: TeamsheetSource;
  ots: string;
  icons: MonIcon[];
};

export type TeamsheetValue = {
  // What is typed in the link field. Kept even while a sheet is accepted, so
  // the field still shows the link it came from.
  link: string;
  // The validated sheet, whichever route produced it. Null until one is.
  accepted: AcceptedSheet | null;
  // Whether `accepted` came from the import modal rather than a link. Drives
  // the swap from "input + button" to "importiert + entfernen".
  imported: boolean;
  error: string | null;
  // The per-mon problems behind `error` ("Delphox: Wesen fehlt.").
  details: string[];
};

export function emptyTeamsheet(): TeamsheetValue {
  return {
    link: "",
    accepted: null,
    imported: false,
    error: null,
    details: [],
  };
}

// A sheet that is already stored — the staff editor opens on one of these.
// There is no link to show because we never stored one.
export function storedTeamsheet(
  source: TeamsheetSource,
  ots: string,
  icons: MonIcon[],
): TeamsheetValue {
  return {
    link: "",
    accepted: { source, ots, icons },
    imported: true,
    error: null,
    details: [],
  };
}

// Typing in the link field invalidates whatever that field had validated. An
// imported sheet is untouched: its input is not even on screen.
export function withLink(value: TeamsheetValue, link: string): TeamsheetValue {
  if (value.imported) {
    return value;
  }
  return { ...value, link, accepted: null, error: null, details: [] };
}

export function withAccepted(
  value: TeamsheetValue,
  accepted: AcceptedSheet,
  imported: boolean,
): TeamsheetValue {
  return { ...value, accepted, imported, error: null, details: [] };
}

export function withError(
  value: TeamsheetValue,
  error: string,
  details: string[] = [],
): TeamsheetValue {
  return { ...value, accepted: null, error, details };
}

// "Entfernen" on an imported sheet returns the slot to an empty link field.
export function cleared(): TeamsheetValue {
  return emptyTeamsheet();
}

export function isAccepted(value: TeamsheetValue): boolean {
  return value.accepted !== null;
}

// Whether the link field is worth validating: non-empty, and not already
// validated to exactly this value.
export function shouldValidateLink(value: TeamsheetValue): boolean {
  return !value.imported && value.link.trim() !== "" && value.accepted === null;
}
