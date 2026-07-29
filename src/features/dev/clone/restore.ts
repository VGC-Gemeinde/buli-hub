// Making a production dump restorable into a target we do not own as fully as
// Supabase owns production.
//
// `pg_dump` faithfully reproduces the default-privilege ACLs of every role that
// has them in the source schema. Production has two: `postgres` and
// `supabase_admin`. Replaying the `supabase_admin` ones fails with
// `permission denied to change default privileges`, because altering another
// role's defaults requires membership in that role, and the `postgres` role on
// hosted Supabase — and on the local CLI stack — is not a superuser.
//
// Dropping them loses nothing. Default privileges only affect objects created
// *later* by that role; `supabase_admin` creates nothing in our schema, and the
// local stack already configures its own defaults for that role. The `postgres`
// ones are kept, because migrations run as `postgres` and production's defaults
// are what give a newly created table its grants.

const FOR_ROLE = /^ALTER DEFAULT PRIVILEGES FOR ROLE (\S+)/;

/**
 * Removes `ALTER DEFAULT PRIVILEGES FOR ROLE <other>` statements from a dump,
 * keeping those for `keepRole`. Everything else — grants, policies, RLS,
 * ownership — is passed through untouched.
 */
export function stripForeignDefaultPrivileges(
  sql: string,
  keepRole = "postgres",
): string {
  const kept: string[] = [];
  // pg_dump writes these on one line, but a long role list could wrap, so
  // skipping continues until the statement terminator rather than one line.
  let skippingUntilSemicolon = false;

  for (const line of sql.split("\n")) {
    if (skippingUntilSemicolon) {
      if (line.trimEnd().endsWith(";")) {
        skippingUntilSemicolon = false;
      }
      continue;
    }

    const role = FOR_ROLE.exec(line)?.[1];
    if (role !== undefined && role !== keepRole) {
      skippingUntilSemicolon = !line.trimEnd().endsWith(";");
      continue;
    }

    kept.push(line);
  }

  return kept.join("\n");
}
