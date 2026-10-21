import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mapAccounts } from "./accounts";
import {
  loadIntoTarget,
  publicTables,
  readCounts,
  TARGET_ONLY_TABLES,
} from "./load";
import { allOk, compareAccounts, compareCounts } from "./verify";

// The move between two throwaway databases on the local server: a source
// shaped like Supabase (the hub's tables plus auth.users, no public.users)
// and a target built from the committed baseline.

const admin = postgres(process.env.DATABASE_URL as string, {
  onnotice: () => {},
});
const SOURCE_DB = "move_test_source";
const TARGET_DB = "move_test_target";
let source: Sql;
let target: Sql;

function urlFor(database: string): string {
  const url = new URL(process.env.DATABASE_URL as string);
  url.pathname = `/${database}`;
  return url.toString();
}

async function freshDatabase(name: string): Promise<Sql> {
  await admin.unsafe(`drop database if exists ${name} with (force)`);
  await admin.unsafe(`create database ${name}`);
  const sql = postgres(urlFor(name), { onnotice: () => {}, max: 4 });
  await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  return sql;
}

const staff = randomUUID();
const playerA = randomUUID();
const playerB = randomUUID();

beforeAll(async () => {
  source = await freshDatabase(SOURCE_DB);
  // Supabase's shape: accounts in auth.users, no public.users or sessions.
  await source.unsafe(`
    drop table sessions, users cascade;
    create schema auth;
    create table auth.users (
      id uuid primary key,
      raw_user_meta_data jsonb,
      created_at timestamptz not null default now()
    );`);
  for (const [id, meta] of [
    [staff, { provider_id: "700000000000000009" }],
    [playerA, { provider_id: "700000000000000001" }],
    [playerB, { sub: "700000000000000002" }],
  ] as const) {
    await source`insert into auth.users (id, raw_user_meta_data)
      values (${id}, ${JSON.stringify(meta)}::jsonb)`;
  }
  await source`insert into profiles ${source([
    { user_id: staff, display_name: "Staffi" },
    { user_id: playerA, display_name: "Anton" },
    { user_id: playerB, display_name: "Bea" },
  ])}`;
  const [window] = await source<{ id: string }[]>`
    insert into registration_windows (closes_at, opened_by, season_number)
    values (now(), ${staff}, 9) returning id`;
  const [match] = await source<{ id: string }[]>`
    insert into matches
      (window_id, stage, tie_key, tier, position, round, player_a_id, player_b_id)
    values
      (${window.id}, 'tiebreaker', 'group:x:0', 1, 1, 1, ${playerA}, ${playerB})
    returning id`;
  await source`
    insert into match_results (match_id, outcome, reported_by_id)
    values (${match.id}, 'double_loss', ${staff})`;
  // A completed season: its results may no longer be written, which the
  // load must get past without weakening the lock afterwards.
  await source`
    update registration_windows set season_completed_at = now()
    where id = ${window.id}`;
});

afterAll(async () => {
  await source?.end();
  await target?.end();
  await admin.unsafe(`drop database if exists ${SOURCE_DB} with (force)`);
  await admin.unsafe(`drop database if exists ${TARGET_DB} with (force)`);
  await admin.end();
});

async function sourceAccounts() {
  const rows = await source<
    { id: string; raw_user_meta_data: unknown; created_at: Date }[]
  >`select id, raw_user_meta_data, created_at from auth.users`;
  return mapAccounts(rows);
}

describe("loadIntoTarget", () => {
  it("copies every row and every account, and the checks pass", async () => {
    target = await freshDatabase(TARGET_DB);
    const { accounts, withoutDiscordId } = await sourceAccounts();
    expect(withoutDiscordId).toEqual([]);

    await loadIntoTarget(source, target, accounts);

    const tables = await publicTables(source);
    const counts = compareCounts(
      await readCounts(source, tables),
      await readCounts(target, [...tables, ...TARGET_ONLY_TABLES]),
    );
    const users = await target<{ id: string; discordId: string }[]>`
      select id, discord_id as "discordId" from users`;
    expect(allOk([...counts, ...compareAccounts(accounts, users)])).toBe(true);
  });

  it("keeps the closed-season lock working after the load", async () => {
    await expect(
      target`update match_results set video_url = 'x'`,
    ).rejects.toThrow(/are final/);
  });

  it("restores every foreign key", async () => {
    const [{ n }] = await target<{ n: number }[]>`
      select count(*)::int as n from pg_constraint
      where contype = 'f' and connamespace = 'public'::regnamespace`;
    expect(n).toBe(58);
  });

  it("refuses a target that already holds accounts", async () => {
    const { accounts } = await sourceAccounts();
    await expect(loadIntoTarget(source, target, accounts)).rejects.toThrow(
      /already holds accounts/,
    );
  });

  it("fails as a whole on a row whose account is missing", async () => {
    await target.end();
    target = await freshDatabase(TARGET_DB);
    const { accounts } = await sourceAccounts();
    // Leave one account out: the profile pointing at it is an orphan.
    await expect(
      loadIntoTarget(
        source,
        target,
        accounts.filter((account) => account.id !== playerB),
      ),
    ).rejects.toThrow();
    const [{ n }] = await target<{ n: number }[]>`
      select count(*)::int as n from profiles`;
    expect(n).toBe(0);
  });
});
