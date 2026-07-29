// Refuses to run the test suite against anything but a local database.
//
// The integration tests clear shared tables in `beforeAll` — `delete from
// registration_windows`, truncations, direct writes into `auth.users`. They do
// that against whatever `DATABASE_URL` points at, with no notion of which
// database that is. A single mistyped or pasted connection string is therefore
// enough to delete the live league, and nothing else in the toolchain would
// stop it.
//
// This has already come close once: a production string was pasted into
// `DATABASE_URL` while setting up `db:clone-prod`. The clone script refused
// (it has its own guards), but `npm test` would not have.
//
// Legitimate runs are always local — `npm run dev` against the Supabase CLI
// stack, and CI against the same stack on 127.0.0.1 — so this costs nothing.

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

/** IPv6 hosts arrive bracketed from `new URL()`; compare them unbracketed. */
function hostnameOf(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, "");
}

export function isLocalDatabaseUrl(url: string): boolean {
  try {
    return LOCAL_HOSTNAMES.has(hostnameOf(new URL(url)));
  } catch {
    // Not a URL at all — cannot establish that it is local, so it is not.
    return false;
  }
}

/**
 * The message to abort with, or null when the configuration is safe.
 *
 * Returns a string rather than throwing so the decision itself is testable.
 * An unset `DATABASE_URL` is fine: unit tests do not need one, and the
 * integration tests fail loudly on their own when they cannot connect.
 */
export function localDatabaseError(
  databaseUrl: string | undefined,
  allowNonLocal = false,
): string | null {
  if (!databaseUrl || allowNonLocal || isLocalDatabaseUrl(databaseUrl)) {
    return null;
  }

  let where: string;
  try {
    const parsed = new URL(databaseUrl);
    where = `${hostnameOf(parsed)}:${parsed.port || "5432"}`;
  } catch {
    where = "an unparseable connection string";
  }

  return [
    `Refusing to run tests: DATABASE_URL points at ${where}, which is not local.`,
    "",
    "The integration tests delete and truncate tables on startup. Against a",
    "hosted database that destroys real data.",
    "",
    "DATABASE_URL must be the local Supabase stack, e.g.",
    "  postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    "",
    "Cloning production reads from PROD_DATABASE_URL and writes to DATABASE_URL;",
    "the production string belongs in the former only (docs/deployment.md §6).",
    "",
    "If a non-local target is genuinely intended, set",
    "ALLOW_NONLOCAL_TEST_DATABASE=true.",
  ].join("\n");
}
