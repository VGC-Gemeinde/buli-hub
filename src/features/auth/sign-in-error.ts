// Classifies a failed OAuth round-trip into a fixed set of categories. The
// category is the only thing that travels via URL to the landing page; the
// raw provider/Supabase strings stay in the server log so internals never
// reach the UI.

export const SIGN_IN_ERROR_PARAM = "auth_error";

export type SignInErrorKind = "no_email" | "cancelled" | "unknown";

export const SIGN_IN_ERROR_KINDS: readonly SignInErrorKind[] = [
  "no_email",
  "cancelled",
  "unknown",
];

/** What Supabase Auth appends to the redirect when it rejects a sign-in. */
export type SignInFailure = {
  /** `error` query param, e.g. "server_error", "access_denied". */
  error: string | null;
  /** `error_description` query param, free text from Supabase or Discord. */
  description: string | null;
  /** Message from a failed `exchangeCodeForSession`, if a code was present. */
  exchangeError: string | null;
};

export function classifySignInError(failure: SignInFailure): SignInErrorKind {
  const text =
    `${failure.description ?? ""} ${failure.exchangeError ?? ""}`.toLowerCase();
  // Supabase Auth: Discord returned no (verified) email for the account.
  if (text.includes("email") && text.includes("external provider")) {
    return "no_email";
  }
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
  no_email:
    "Dein Discord-Konto hat keine bestätigte E-Mail-Adresse. Bitte bestätige sie in den Discord-Einstellungen und versuche es dann erneut.",
  cancelled:
    "Die Anmeldung wurde abgebrochen. Du kannst es jederzeit erneut versuchen.",
  unknown: "Anmeldung fehlgeschlagen. Bitte versuche es erneut.",
};
