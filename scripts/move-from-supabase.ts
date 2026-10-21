// Moves the hub's data from Supabase to Cloud SQL and Cloud Storage, once per
// environment (specs/004-google-cloud-migration, contracts/switch-procedure.md).
// Orchestration only; the transfer and every check live in src/features/move/.
//
//   npm run db:move-from-supabase -- --dry-run
//   npm run db:move-from-supabase -- --photos-from=https://<ref>.supabase.co \
//     --photos-to=buli-hub-stream-photos
//
// The source is only read. The target is the empty Cloud SQL database through
// the Auth Proxy. The hub must be in maintenance while this runs; the runbook
// (docs/deployment.md "Umzug von Supabase") does that around it.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import postgres from "postgres";
import { mapAccounts } from "../src/features/move/accounts.ts";
import {
  loadIntoTarget,
  publicTables,
  readCounts,
  TARGET_ONLY_TABLES,
} from "../src/features/move/load.ts";
import { parseStorageListing } from "../src/features/move/photos.ts";
import {
  allOk,
  type CheckRow,
  compareAccounts,
  compareCounts,
  comparePhotos,
} from "../src/features/move/verify.ts";

const PHOTO_BUCKET_SOURCE = "stream-photos";
const CACHE_CONTROL = "public, max-age=31536000";

const { values } = parseArgs({
  options: {
    source: { type: "string" },
    target: { type: "string" },
    "photos-from": { type: "string" },
    "photos-to": { type: "string" },
    "reset-target": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (values.help) {
  console.log(`
Move the hub from Supabase to Cloud SQL and Cloud Storage.

  --source=<url>        Supabase session string (default: SUPABASE_DATABASE_URL).
  --target=<url>        Empty Cloud SQL database via the Auth Proxy
                        (default: MOVE_TARGET_DATABASE_URL).
  --photos-from=<url>   Supabase project URL, e.g. https://<ref>.supabase.co.
  --photos-to=<bucket>  Target bucket, e.g. buli-hub-stream-photos.
  --reset-target        Drop the target's public and drizzle schemas first
                        (asks for the database name).
  --dry-run             Print the plan; touch nothing.
`);
  process.exit(0);
}

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

const sourceUrl = values.source ?? process.env.SUPABASE_DATABASE_URL;
const targetUrl = values.target ?? process.env.MOVE_TARGET_DATABASE_URL;
const photosFrom = values["photos-from"]?.replace(/\/+$/, "");
const photosTo = values["photos-to"];
if (!sourceUrl) fail("No source: pass --source or set SUPABASE_DATABASE_URL.");
if (!targetUrl)
  fail("No target: pass --target or set MOVE_TARGET_DATABASE_URL.");
if (!photosFrom || !photosTo) fail("Pass --photos-from and --photos-to.");
if (sourceUrl === targetUrl) fail("Source and target are the same database.");

const where = (url: string) => {
  const parsed = new URL(url);
  return `${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
};
console.log(`
Source (read only): ${where(sourceUrl)}
Target:             ${where(targetUrl)}
Photos:             ${photosFrom}/…/${PHOTO_BUCKET_SOURCE} → gs://${photosTo}
`);
if (values["dry-run"]) {
  console.log(
    "Dry run. Steps: [reset target] → migrate target → accounts → data → photos → verify.",
  );
  process.exit(0);
}

const source = postgres(sourceUrl, { max: 2, onnotice: () => {} });
const target = postgres(targetUrl, { max: 2, onnotice: () => {} });

try {
  // 1. Optional reset, after typing the database name.
  if (values["reset-target"]) {
    const name = new URL(targetUrl).pathname.slice(1);
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question(
      `Drop schemas public and drizzle in "${name}"? Type the database name: `,
    );
    rl.close();
    if (answer.trim() !== name) fail("Not confirmed.");
    await target.unsafe(
      "drop schema if exists drizzle cascade; drop schema if exists public cascade; create schema public;",
    );
  }

  // 2. The new baseline on the target.
  console.log("→ drizzle-kit migrate on the target");
  execFileSync("npx", ["drizzle-kit", "migrate"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: targetUrl },
  });

  // 3. Accounts: every one needs a Discord id, or nothing moves.
  const sourceRows = await source<
    { id: string; raw_user_meta_data: unknown; created_at: Date }[]
  >`select id, raw_user_meta_data, created_at from auth.users`;
  const { accounts, withoutDiscordId } = mapAccounts(sourceRows);
  if (withoutDiscordId.length > 0) {
    fail(
      `Accounts without a Discord id (resolve them first):\n  ${withoutDiscordId.join("\n  ")}`,
    );
  }
  console.log(`→ ${accounts.length} accounts`);

  // 4. Data, in one transaction on the target.
  console.log("→ copying data");
  await loadIntoTarget(source, target, accounts);

  // 5. Photos: fresh copy of every object, same paths.
  const objects = await source<{ name: string; size: string | null }[]>`
    select name, metadata->>'size' as size from storage.objects
    where bucket_id = ${PHOTO_BUCKET_SOURCE}`;
  const sourceSizes = new Map(
    objects.map((object) => [object.name, Number(object.size)]),
  );
  console.log(`→ copying ${objects.length} photos`);
  const dir = mkdtempSync(join(tmpdir(), "buli-hub-photos-"));
  try {
    for (const object of objects) {
      const response = await fetch(
        `${photosFrom}/storage/v1/object/public/${PHOTO_BUCKET_SOURCE}/${object.name}`,
      );
      if (!response.ok) {
        fail(`Photo ${object.name}: ${response.status}`);
      }
      const file = join(dir, object.name);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    }
    if (objects.length > 0) {
      execFileSync(
        "gcloud",
        [
          "storage",
          "rsync",
          dir,
          `gs://${photosTo}`,
          "--recursive",
          `--cache-control=${CACHE_CONTROL}`,
        ],
        { stdio: "inherit" },
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // 6. Verify.
  const tables = await publicTables(source);
  const targetUsers = await target<{ id: string; discordId: string }[]>`
    select id, discord_id as "discordId" from users`;
  const referenced = (
    await target<{ path: string }[]>`
      select stream_photo_path as path from profiles
      where stream_photo_path is not null`
  ).map((row) => row.path);
  const listing =
    objects.length > 0
      ? execFileSync(
          "gcloud",
          ["storage", "ls", "-l", "-r", `gs://${photosTo}/**`],
          {
            encoding: "utf8",
          },
        )
      : "";
  const rows: CheckRow[] = [
    ...compareCounts(
      await readCounts(source, tables),
      await readCounts(target, [...tables, ...TARGET_ONLY_TABLES]),
    ),
    ...compareAccounts(accounts, targetUsers),
    ...comparePhotos(
      referenced,
      sourceSizes,
      parseStorageListing(listing, photosTo),
    ),
  ];
  console.log("");
  console.table(
    rows.map((row) => ({
      check: row.check,
      ok: row.ok ? "✓" : "✗",
      detail: row.detail,
    })),
  );
  if (!allOk(rows)) {
    fail("Verification failed. Do not switch; the hub stays on Supabase.");
  }
  console.log("\n✓ Verified. The hub can be switched to Google Cloud.\n");
} finally {
  await source.end();
  await target.end();
}
