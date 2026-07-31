// Clones production into a target database and transforms it into a usable
// test fixture. See docs/deployment.md → "Cloning production".
//
//   npm run db:clone-prod -- --shift="30 days"
//   npm run db:clone-prod -- --shift="-2 weeks" --scrub
//   npm run db:clone-prod -- --dry-run
//
// Pipeline: dump → restore → scrub (opt-in) → clear discord_posts → shift
// dates → migrate. Production is only ever read from.
//
// The last step is the point of the whole thing: because the drizzle journal
// comes across with the dump, `drizzle-kit migrate` then applies exactly the
// migrations production has not seen yet, against production-shaped data. If
// it fails there, it would have failed in production.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { stripForeignDefaultPrivileges } from "../src/features/dev/clone/restore.ts";
import { buildScrubSql, KEPT_ROLES } from "../src/features/dev/clone/scrub.ts";
import {
  buildShiftSql,
  parseShiftInterval,
  type TimestampColumn,
} from "../src/features/dev/clone/shift.ts";

try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional; the connection strings may come from the environment.
}

const { values } = parseArgs({
  options: {
    shift: { type: "string" },
    source: { type: "string" },
    target: { type: "string" },
    scrub: { type: "boolean", default: false },
    "no-migrate": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (values.help) {
  console.log(`
Clone production into a target database.

  --shift="<interval>"  Offset every timestamp, e.g. "30 days", "-2 weeks 6 hours".
                        Omit to keep the snapshot's own dates.
  --scrub               Replace personal data with synthetic equivalents.
                        Staff+ keep their identity; everyone else is anonymised.
                        Required for any target other than your own machine.
  --source=<url>        Source connection (default: PROD_DATABASE_URL).
  --target=<url>        Target connection (default: CLONE_TARGET_DATABASE_URL, then DATABASE_URL).
  --no-migrate          Skip the closing drizzle-kit migrate.
  --dry-run             Print the plan and the generated SQL; touch nothing.
`);
  process.exit(0);
}

const dryRun = values["dry-run"];

function fail(message: string): never {
  console.error(`\nclone-prod: ${message}\n`);
  process.exit(1);
}

// --- Connections -----------------------------------------------------------

const source = values.source ?? process.env.PROD_DATABASE_URL;
if (!source) {
  fail(
    "No source. Set PROD_DATABASE_URL to production's *session* connection string (port 5432, not the 6543 pooler) or pass --source.",
  );
}

const target =
  values.target ??
  process.env.CLONE_TARGET_DATABASE_URL ??
  process.env.DATABASE_URL;
if (!target) {
  fail(
    "No target. Set DATABASE_URL / CLONE_TARGET_DATABASE_URL or pass --target.",
  );
}

function describe(url: string): {
  host: string;
  database: string;
  key: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    fail(
      "Connection strings must be URLs (postgresql://user:pass@host:port/db).",
    );
  }
  const host = `${parsed.hostname}:${parsed.port || "5432"}`;
  const database = parsed.pathname.replace(/^\//, "") || "postgres";
  // The username belongs in the identity: on Supabase's pooler every project
  // shares one hostname, port and database name, and only the username carries
  // the project ref. Keying on host alone reports two unrelated projects as the
  // same database.
  return {
    host,
    database,
    key: `${parsed.username}@${host}/${database}`,
  };
}

const from = describe(source);
const to = describe(target);

// The script drops and recreates the target's public and drizzle schemas, so
// these guards are the only thing between a mistyped flag and wiping the
// league. They are deliberately blunt. The authoritative "not the same
// database" check is assertDistinctDatabases() below, which asks the servers
// themselves rather than trusting the shape of a URL.
if (from.key === to.key) {
  fail(`Refusing to clone ${from.key} onto itself.`);
}
if (process.env.PROD_DATABASE_URL && target === process.env.PROD_DATABASE_URL) {
  fail("Refusing to use PROD_DATABASE_URL as the target.");
}
const targetIsLocal = /^(127\.0\.0\.1|localhost|::1)$/.test(
  new URL(target).hostname,
);
if (!targetIsLocal && process.env.CLONE_ALLOW_REMOTE_TARGET !== "true") {
  fail(
    `Target ${to.key} is not local. Set CLONE_ALLOW_REMOTE_TARGET=true to confirm you mean to overwrite a hosted database.`,
  );
}
if (!targetIsLocal && !values.scrub) {
  fail(
    "A non-local target must be scrubbed (--scrub): the clone lands somewhere that widens access to real personal data.",
  );
}

// Validate the inputs that build SQL up front, so a typo fails on the command
// line rather than three minutes into a dump.
function validated<T>(build: () => T): T {
  try {
    return build();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

const shift = values.shift
  ? validated(() => parseShiftInterval(values.shift as string))
  : null;

// --- Tooling ---------------------------------------------------------------

function toolVersion(tool: string): number {
  const result = spawnSync(tool, ["--version"], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    fail(
      `${tool} not found. Install the PostgreSQL client tools — see docs/deployment.md §6.`,
    );
  }
  const major = Number(result.stdout.match(/(\d+)\./)?.[1]);
  if (!Number.isFinite(major)) {
    fail(`Could not read a version from \`${tool} --version\`.`);
  }
  return major;
}

function checkTooling(sourceUrl: string): void {
  const dumpMajor = toolVersion("pg_dump");
  toolVersion("psql");

  // pg_dump refuses to dump from a server newer than itself. Compare against
  // what the source actually runs rather than a hardcoded version: a client one
  // major behind is perfectly fine when the server is too, and hardcoding it
  // would send people installing a package their distribution may not carry.
  // (psql needs no such check — it is only ever a plain SQL client here.)
  const versionNum = Number(
    psqlQuery(
      "select current_setting('server_version_num');",
      sourceUrl,
    ).trim(),
  );
  const sourceMajor = Math.floor(versionNum / 10000);
  if (!Number.isFinite(sourceMajor) || sourceMajor < 1) {
    fail("Could not read the source server's PostgreSQL version.");
  }
  if (dumpMajor < sourceMajor) {
    fail(
      `pg_dump is version ${dumpMajor} but the source runs PostgreSQL ${sourceMajor}, and pg_dump cannot dump from a newer server.\n` +
        `  Install postgresql-client-${sourceMajor} (on Ubuntu this needs the PGDG repository — see docs/deployment.md §6).`,
    );
  }
  console.log(`  server  PostgreSQL ${sourceMajor} (pg_dump ${dumpMajor})`);
}

/**
 * The authoritative "these are not the same database" check: ask both servers
 * for their cluster's `system_identifier` — assigned at initdb, so it is a
 * genuine fingerprint — together with the database oid.
 *
 * Comparing connection strings cannot do this. Supabase's pooler puts every
 * project on one hostname, port and database name, distinguished only by the
 * username, while the same database is also reachable by several different
 * URLs. Only the server can answer the question.
 */
function assertDistinctDatabases(sourceUrl: string, targetUrl: string): void {
  const fingerprint = (url: string) =>
    psqlQuery(
      "select system_identifier || '/' || (select oid from pg_database where datname = current_database()) from pg_control_system();",
      url,
    ).trim();

  if (fingerprint(sourceUrl) === fingerprint(targetUrl)) {
    fail(
      "Refusing to run: source and target are the same database.\n" +
        "  The connection strings differ, but both resolve to one cluster and database.",
    );
  }
}

// --- Steps -----------------------------------------------------------------

function run(tool: string, args: string[], url: string): void {
  const result = spawnSync(tool, [...args, url], {
    stdio: ["ignore", "inherit", "inherit"],
    // Keep credentials out of argv where other processes can read them.
    env: { ...process.env, PGCONNECT_TIMEOUT: "30" },
  });
  if (result.error) {
    fail(`${tool} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${tool} exited with status ${result.status}.`);
  }
}

function psqlScript(sql: string, url: string): void {
  const result = spawnSync(
    "psql",
    ["--variable=ON_ERROR_STOP=1", "--no-psqlrc", "--quiet", "--file=-", url],
    { input: sql, stdio: ["pipe", "inherit", "inherit"] },
  );
  if (result.status !== 0) {
    fail(`psql exited with status ${result.status}.`);
  }
}

function psqlQuery(sql: string, url: string): string {
  const result = spawnSync(
    "psql",
    [
      "--variable=ON_ERROR_STOP=1",
      "--no-psqlrc",
      "--tuples-only",
      "--no-align",
      "--field-separator=\t",
      "--command",
      sql,
      url,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  if (result.status !== 0) {
    fail(`psql query failed with status ${result.status}.`);
  }
  return result.stdout;
}

const step = (n: number, what: string) => console.log(`\n[${n}/6] ${what}`);

console.log(`clone-prod
  source  ${from.key} (read-only)
  target  ${to.key}
  scrub   ${values.scrub ? "yes (staff+ keep their identity)" : "no"}
  shift   ${shift ?? "none"}
  migrate ${values["no-migrate"] ? "no" : "yes"}`);

if (!dryRun) {
  checkTooling(source);
  assertDistinctDatabases(source, target);
}

if (dryRun) {
  console.log("\n--dry-run: nothing will be executed.\n");
  if (values.scrub) {
    console.log("--- scrub SQL ---");
    console.log(buildScrubSql().join("\n\n"));
  }
  if (shift) {
    console.log("\n--- shift SQL (columns resolved at run time) ---");
    console.log(
      buildShiftSql(
        [{ table: "<each table>", column: "<each column>", kind: "timestamp" }],
        shift,
      ).join("\n"),
    );
  }
  process.exit(0);
}

const workDir = mkdtempSync(join(tmpdir(), "buli-clone-"));
process.on("exit", () => rmSync(workDir, { recursive: true, force: true }));

try {
  // 1. Dump. Three files, because the auth tables need a different strategy
  //    from our own schema and must be restored in FK order.
  step(1, "Dumping production");
  const appDump = join(workDir, "app.sql");
  const usersDump = join(workDir, "auth_users.sql");
  const identitiesDump = join(workDir, "auth_identities.sql");

  // --no-owner: the target's owning role differs between hosted Supabase and
  // the local CLI stack. Privileges are kept — the schema relies on
  // column-level grants (see src/db/schema.ts).
  run(
    "pg_dump",
    ["--schema=public", "--schema=drizzle", "--no-owner", `--file=${appDump}`],
    source,
  );

  // Production's schema carries default-privilege ACLs for `supabase_admin`,
  // which no non-superuser can replay. Dropping them costs nothing; see
  // src/features/dev/clone/restore.ts.
  writeFileSync(
    appDump,
    stripForeignDefaultPrivileges(readFileSync(appDump, "utf8")),
  );

  // --column-inserts rather than COPY: auth is Supabase-managed, and the
  // hosted project's gotrue version may not have exactly the columns the local
  // CLI stack has. Named columns tolerate the target having extra ones and
  // fail with a readable error rather than a column-count mismatch.
  for (const [table, file] of [
    ["auth.users", usersDump],
    ["auth.identities", identitiesDump],
  ] as const) {
    run(
      "pg_dump",
      [
        `--table=${table}`,
        "--data-only",
        "--column-inserts",
        "--no-owner",
        `--file=${file}`,
      ],
      source,
    );
  }

  // 2. Restore. Drop our schemas first so the FKs into auth.users go with
  //    them, which is what makes emptying the auth tables possible. The dumps
  //    recreate both schemas, so nothing is created here.
  step(2, "Restoring into the target");
  psqlScript(
    `drop schema if exists public cascade;
drop schema if exists drizzle cascade;
delete from auth.identities;
delete from auth.users;`,
    target,
  );
  run(
    "psql",
    [
      "--variable=ON_ERROR_STOP=1",
      "--no-psqlrc",
      "--quiet",
      `--file=${usersDump}`,
    ],
    target,
  );
  run(
    "psql",
    [
      "--variable=ON_ERROR_STOP=1",
      "--no-psqlrc",
      "--quiet",
      `--file=${identitiesDump}`,
    ],
    target,
  );
  run(
    "psql",
    [
      "--variable=ON_ERROR_STOP=1",
      "--no-psqlrc",
      "--quiet",
      `--file=${appDump}`,
    ],
    target,
  );

  // 3. Scrub.
  if (values.scrub) {
    step(3, "Scrubbing personal data");
    psqlScript(buildScrubSql().join("\n"), target);
    // Reported after the fact, not before: who is exempt is a property of the
    // copied data, not of the command line.
    const [kept, total] = psqlQuery(
      `select count(*) filter (where p.role::text = any(array[${KEPT_ROLES.map((r) => `'${r}'`).join(", ")}])),
              count(*)
       from auth.users u
       left join "public"."profiles" p on p.user_id = u.id;`,
      target,
    )
      .trim()
      .split("\t");
    console.log(
      `      ${kept} of ${total} user(s) kept their identity (staff+)`,
    );
  } else {
    step(3, "Scrub skipped (--scrub not given)");
  }

  // 4. Clear discord_posts. The copied rows point at message ids in the
  //    production channels, which the local/staging bot cannot reach. The 404
  //    path would self-heal by re-posting the entire season into the test
  //    channel — truncating avoids that.
  step(4, "Clearing discord_posts");
  psqlScript(`truncate table "public"."discord_posts";`, target);

  // 5. Shift dates.
  if (shift) {
    step(5, `Shifting every timestamp by ${shift}`);
    const rows = psqlQuery(
      `select c.table_name, c.column_name, c.data_type
       from information_schema.columns c
       join information_schema.tables t
         on t.table_schema = c.table_schema and t.table_name = c.table_name
       where c.table_schema = 'public'
         and t.table_type = 'BASE TABLE'
         and c.is_generated = 'NEVER'
         and c.is_updatable = 'YES'
         and c.data_type in ('timestamp with time zone', 'timestamp without time zone', 'date')
       order by c.table_name, c.column_name;`,
      target,
    );
    const columns: TimestampColumn[] = rows
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [table, column, dataType] = line.split("\t");
        return {
          table,
          column,
          kind: dataType === "date" ? "date" : "timestamp",
        };
      });
    const statements = buildShiftSql(columns, shift);
    console.log(
      `      ${columns.length} column(s) across ${statements.length} table(s)`,
    );
    psqlScript(statements.join("\n"), target);
  } else {
    step(5, "Date shift skipped (--shift not given)");
  }

  // 6. Migrate — the migration rehearsal.
  if (values["no-migrate"]) {
    step(6, "Migration skipped (--no-migrate)");
  } else {
    step(6, "Applying pending migrations (the rehearsal)");
    execFileSync("npx", ["drizzle-kit", "migrate"], {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: target },
    });
  }

  console.log(`\nDone. ${to.key} now holds production-shaped data.\n`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
