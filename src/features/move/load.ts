import type { Sql } from "postgres";
import type { Account } from "./accounts";

// Copies the hub's data from the Supabase database into a target built from
// the new baseline (specs/004-google-cloud-migration, research.md R5,
// contracts/switch-procedure.md). One transaction on the target, plain COPY,
// no superuser: the target's foreign keys are dropped for the load and
// re-added after it, which re-validates every row, and the hub's own triggers
// (the closed-season lock) are off while the rows go in. The source is only
// ever read.

/** Tables the baseline has and Supabase's public schema has not. */
export const TARGET_ONLY_TABLES = ["users", "sessions"] as const;

type ForeignKey = { table: string; name: string; definition: string };

export async function publicTables(sql: Sql): Promise<string[]> {
  const rows = await sql<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name`;
  return rows.map((row) => row.table_name);
}

async function columns(sql: Sql, table: string): Promise<string[]> {
  const rows = await sql<{ column_name: string }[]>`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = ${table}
    order by column_name`;
  return rows.map((row) => row.column_name);
}

/** Row counts of the given tables. */
export async function readCounts(
  sql: Sql,
  tables: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const [row] = await sql<{ n: number }[]>`
      select count(*)::int as n from ${sql(table)}`;
    counts[table] = row.n;
  }
  return counts;
}

/**
 * The tables to copy: every public table of the source. Each must exist in the
 * target with exactly the same columns; anything else means the target was
 * not built from the baseline that matches this source, and nothing is copied.
 */
export async function tablesToCopy(
  source: Sql,
  target: Sql,
): Promise<string[]> {
  const sourceTables = await publicTables(source);
  const targetTables = new Set(await publicTables(target));
  const problems: string[] = [];
  for (const table of sourceTables) {
    if (!targetTables.has(table)) {
      problems.push(`${table}: not in the target`);
      continue;
    }
    const from = (await columns(source, table)).join(",");
    const to = (await columns(target, table)).join(",");
    if (from !== to) {
      problems.push(`${table}: columns differ (${from} vs ${to})`);
    }
  }
  for (const table of targetTables) {
    if (
      !sourceTables.includes(table) &&
      !(TARGET_ONLY_TABLES as readonly string[]).includes(table)
    ) {
      problems.push(`${table}: only in the target`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`Schemas do not match:\n  ${problems.join("\n  ")}`);
  }
  return sourceTables;
}

export async function loadIntoTarget(
  source: Sql,
  target: Sql,
  accounts: Account[],
): Promise<void> {
  const tables = await tablesToCopy(source, target);
  const [{ n }] = await target<{ n: number }[]>`
    select count(*)::int as n from users`;
  if (n > 0) {
    throw new Error(
      "The target already holds accounts. Never merge into a half-loaded target: rebuild it (--reset-target) and run again.",
    );
  }

  await target.begin(async (tx) => {
    const foreignKeys = await tx<ForeignKey[]>`
      select conrelid::regclass::text as table, conname as name,
             pg_get_constraintdef(oid) as definition
      from pg_constraint
      where contype = 'f' and connamespace = 'public'::regnamespace`;
    for (const fk of foreignKeys) {
      await tx`alter table ${tx(fk.table)} drop constraint ${tx(fk.name)}`;
    }
    const allTables = [...tables, ...TARGET_ONLY_TABLES];
    for (const table of allTables) {
      await tx`alter table ${tx(table)} disable trigger user`;
    }

    for (let i = 0; i < accounts.length; i += 500) {
      const batch = accounts.slice(i, i + 500).map((account) => ({
        id: account.id,
        discord_id: account.discordId,
        created_at: account.createdAt,
      }));
      await tx`insert into users ${tx(batch)}`;
    }

    for (const table of tables) {
      const cols = await columns(source, table);
      const list = cols.map((col) => `"${col}"`).join(", ");
      // Read the whole table, then write it in one piece: the hub's tables
      // are small (production holds a few MB), and piping one connection's
      // COPY stream straight into another's stalled on real data while both
      // waited on each other's backpressure.
      const chunks: Buffer[] = [];
      const readable = await source
        .unsafe(`copy (select ${list} from public."${table}") to stdout`)
        .readable();
      for await (const chunk of readable) {
        chunks.push(chunk as Buffer);
      }
      const writable = await tx
        .unsafe(`copy public."${table}" (${list}) from stdin`)
        .writable();
      await new Promise<void>((resolve, reject) => {
        writable.on("error", reject);
        writable.end(Buffer.concat(chunks), () => resolve());
      });
    }

    // Re-adding validates every row against its key: an orphan fails here,
    // inside the transaction, and the target stays empty.
    for (const fk of foreignKeys) {
      await tx.unsafe(
        `alter table ${fk.table} add constraint "${fk.name}" ${fk.definition}`,
      );
    }
    for (const table of allTables) {
      await tx`alter table ${tx(table)} enable trigger user`;
    }
  });
}
