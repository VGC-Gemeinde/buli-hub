// Replay Cloud Run's request logs into the usage counters, once.
// See docs/plans/usage-stats.md and docs/deployment.md §4.
//
//   npm run usage:backfill                    # dry run: reads logs, prints numbers
//   npm run usage:backfill -- --apply         # writes to PROD_DATABASE_URL
//   npm run usage:backfill -- --target=$DATABASE_URL --apply   # local rehearsal
//
// Counting starts when the feature deploys, but Cloud Run has been logging
// every request (url, address, agent) all along, with 30 days of retention.
// This folds that window in so the charts do not open on a month of blanks.
// The replay stops at the instant live counting began, which the target
// database knows (usage_collection.started_at), so the boundary day is not
// counted from both sources.
//
// Reads through `gcloud logging read`, so it needs a gcloud login with access
// to the project. **Addresses never leave this machine**: a visitor is reduced
// to an opaque token here and salted per period before anything is written.
// The one-shot marker in the database means a second run is refused rather
// than doubling every historic day.
//
// Orchestration only; the rules live in src/features/usage (aggregateLogRows
// applies the live counter's own definitions of a page load and a bot).

import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { aggregateLogRows, parseLogCsv } from "@/features/usage/backfill";
import {
  applyBackfill,
  BackfillAlreadyApplied,
  readCollection,
} from "@/features/usage/store";

try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional; the connection string may come from the environment.
}

const { values } = parseArgs({
  options: {
    apply: { type: "boolean", default: false },
    target: { type: "string" },
    project: { type: "string", default: "buli-hub" },
    service: { type: "string", default: "buli-hub" },
    days: { type: "string", default: "30" },
    help: { type: "boolean", default: false },
  },
});

if (values.help) {
  console.log(`
Replay Cloud Run request logs into the usage counters (one-shot).

  --apply             Write the result. Without it: dry run, nothing is written.
  --target=<url>      Database to write to (default: PROD_DATABASE_URL).
  --project=<id>      Google Cloud project holding the logs (default: buli-hub).
  --service=<name>    Cloud Run service name (default: buli-hub).
  --days=<n>          How far back to read (default: 30, the log retention).
`);
  process.exit(0);
}

function fail(message: string): never {
  console.error(`\nbackfill-usage: ${message}\n`);
  process.exit(1);
}

const target = values.target ?? process.env.PROD_DATABASE_URL;
if (!target) {
  fail("No target. Set PROD_DATABASE_URL or pass --target=<url>.");
}
const days = Number(values.days);
if (!Number.isInteger(days) || days <= 0)
  fail("--days must be a positive integer.");

function describe(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
  } catch {
    return "<unparsable url>";
  }
}

/** Pull request logs, oldest first. Tab-separated CSV keeps parsing dull. */
function readLogs(project: string, service: string, freshnessDays: number) {
  const filter =
    `resource.type="cloud_run_revision" AND resource.labels.service_name="${service}" ` +
    `AND httpRequest.requestMethod="GET" AND httpRequest.requestUrl!=""`;
  const raw = execFileSync(
    "gcloud",
    [
      "logging",
      "read",
      filter,
      `--project=${project}`,
      "--order=asc",
      "--limit=500000",
      `--freshness=${freshnessDays}d`,
      '--format=csv[no-heading,separator="\t"](timestamp,httpRequest.requestUrl,httpRequest.remoteIp,httpRequest.userAgent)',
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024 },
  );
  return parseLogCsv(raw);
}

async function main(): Promise<void> {
  const client = postgres(target as string, { prepare: false, max: 1 });
  const database = drizzle(client, { schema });
  try {
    console.log(`Target: ${describe(target as string)}`);
    const collection = await readCollection(database);
    if (collection?.backfilledAt) {
      fail(
        `already backfilled ${collection.backfilledAt.toISOString()} (${collection.backfillVisits} visits through ${collection.backfillThrough?.toISOString()}). Refusing to run twice.`,
      );
    }
    const through = collection?.startedAt ?? new Date();
    console.log(
      collection?.startedAt
        ? `Live counting began ${through.toISOString()}; replaying everything before it.`
        : "Nothing counted live yet; replaying everything up to now.",
    );

    console.log(
      `Reading ${days} days of request logs for ${values.service} in ${values.project} …`,
    );
    const rows = readLogs(values.project, values.service, days);
    console.log(`Read ${rows.length.toLocaleString("de-DE")} log rows.`);

    const { payload, visits, skipped } = aggregateLogRows(
      rows,
      through.toISOString(),
    );
    const dayPeriods = payload.periods.filter((p) => p.kind === "day");
    const people = new Set(dayPeriods.flatMap((p) => p.visitors)).size;
    console.log(
      `Replayable: ${visits} page loads over ${dayPeriods.length} days, ` +
        `${people} distinct visitors, ${payload.periods.length} periods.`,
    );
    console.log(
      `Skipped: ${skipped.bots} bots, ${skipped.afterCutoff} already counted live, ` +
        `${skipped.softNavigations} soft navigations, ${skipped.notPageLoads} non-page requests, ` +
        `${skipped.unparsable} unparsable.`,
    );
    for (const period of dayPeriods) {
      console.log(
        `  ${period.id}  ${String(period.visits).padStart(5)} Aufrufe  ${String(period.visitors.length).padStart(4)} Personen`,
      );
    }

    if (!values.apply) {
      console.log(
        "\nDry run: nothing written. Re-run with --apply to write it.",
      );
      return;
    }
    if (payload.periods.length === 0) {
      fail("nothing to write.");
    }

    const marker = await applyBackfill(database, payload);
    console.log(
      `\nApplied: ${marker.visits} page loads across ${marker.periods} periods, ` +
        `history now starts ${marker.earliestDay}.`,
    );
  } catch (error) {
    if (error instanceof BackfillAlreadyApplied) fail(error.message);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
