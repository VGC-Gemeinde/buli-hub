// Classifies a failed OAuth round-trip into a fixed set of categories. The
// category is the only thing that travels via URL to the landing page; the
// raw Discord and internal reasons stay in the server log so internals never
// reach the UI.

export const SIGN_IN_ERROR_PARAM = "auth_error";

export type SignInErrorKind = "cancelled" | "unknown";

export const SIGN_IN_ERROR_KINDS: readonly SignInErrorKind[] = [
  "cancelled",
  "unknown",
];

/** What came back to the callback when the sign-in did not complete. */
export type SignInFailure = {
  /** Discord's `error` query param, e.g. "access_denied". */
  error: string | null;
};

// Only the identity scope is requested (specs/004-google-cloud-migration,
// FR-004), so Discord has nothing to reject an account for: the user either
// cancels or something failed.
export function classifySignInError(failure: SignInFailure): SignInErrorKind {
  // The user pressed "Abbrechen" on Discord's consent screen.
  if (failure.error === "access_denied") {
    return "cancelled";
  }
  return "unknown";
}

/** Parses the landing page's `?auth_error=` value; anything unexpected is "unknown". */
export function parseSignInErrorKind(
  value: string | undefined,
): SignInErrorKind | null {
  if (!value) return null;
  return (SIGN_IN_ERROR_KINDS as readonly string[]).includes(value)
    ? (value as SignInErrorKind)
    : "unknown";
}

export const SIGN_IN_ERROR_COPY: Record<SignInErrorKind, string> = {
  cancelled:
    "Die Anmeldung wurde abgebrochen. Du kannst es jederzeit erneut versuchen.",
  unknown: "Anmeldung fehlgeschlagen. Bitte versuche es erneut.",
};
