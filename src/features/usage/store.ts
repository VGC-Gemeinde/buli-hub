import { randomBytes } from "node:crypto";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { usageCollection, usagePeriods, usageSalts } from "@/db/schema";
import { db } from "@/lib/db";
import type { BackfillPayload } from "./backfill";
import { HyperLogLog } from "./hll";
import {
  dayId,
  hourId,
  monthId,
  type PeriodId,
  type PeriodKind,
  recentPeriodIds,
  weekId,
} from "./periods";
import {
  buildSummary,
  emptyPeriodRow,
  type PeriodRow,
  type UsageSummary,
} from "./summary";
import { fingerprint, isVisitorToken } from "./visitor";

// The database side of the usage counters. Everything written here is an
// aggregate: counts per period and one sketch per period. No row per request.
//
// Writes happen per page load, without buffering: one short transaction
// against a database that handles that trivially at the hub's volume. The
// only thing cached in memory is a period's salt.

export type UsageDb = typeof db;
/** A connection or a transaction: both run the statements this module needs. */
type Executor = UsageDb | Parameters<Parameters<UsageDb["transaction"]>[0]>[0];

const SALT_BYTES = 32;
/** Salts outlive their period by this much, then nothing can recompute it. */
const SALT_RETENTION_MS = 70 * 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

/** How much history the page draws. */
export const SUMMARY_DAYS = 30;
export const SUMMARY_WEEKS = 12;
export const SUMMARY_MONTHS = 12;

const saltCache = new Map<PeriodId, Buffer>();
let startRecorded = false;
let lastSweepAt = 0;

/**
 * The salt for a period, created by whichever request gets there first and
 * shared by every instance afterwards. One read per period per process; the
 * no-op `do update` is what makes a single statement return the winner's row
 * to the loser of a race.
 */
export async function ensureSalt(
  database: Executor,
  periodId: PeriodId,
): Promise<Buffer> {
  const cached = saltCache.get(periodId);
  if (cached) return cached;
  const [row] = await database
    .insert(usageSalts)
    .values({ periodId, salt: randomBytes(SALT_BYTES) })
    .onConflictDoUpdate({
      target: usageSalts.periodId,
      set: { salt: sql`${usageSalts.salt}` },
    })
    .returning({ salt: usageSalts.salt });
  if (!row) throw new Error(`No salt for ${periodId}`);
  const salt = Buffer.from(row.salt);
  saltCache.set(periodId, salt);
  return salt;
}

/** Drop salts for periods long over, and forget every salt not in use. */
export async function sweepSalts(
  database: Executor,
  now: Date = new Date(),
): Promise<void> {
  const cutoff = new Date(now.getTime() - SALT_RETENTION_MS);
  await database.delete(usageSalts).where(lt(usageSalts.createdAt, cutoff));
  const current = new Set([dayId(now), weekId(now), monthId(now)]);
  for (const id of saltCache.keys()) {
    if (!current.has(id)) saltCache.delete(id);
  }
}

/** Tests: forget everything held in memory. */
export function resetUsageCache(): void {
  saltCache.clear();
  startRecorded = false;
  lastSweepAt = 0;
}

async function recordStart(database: Executor, at: Date): Promise<void> {
  // Earliest wins: a boot after a backfill must not drag the start forward.
  await database
    .insert(usageCollection)
    .values({ id: true, startedAt: at })
    .onConflictDoUpdate({
      target: usageCollection.id,
      set: {
        startedAt: sql`least(${usageCollection.startedAt}, excluded.started_at)`,
      },
    });
}

function currentPeriods(now: Date): { kind: PeriodKind; id: PeriodId }[] {
  return [
    { kind: "day", id: dayId(now) },
    { kind: "week", id: weekId(now) },
    { kind: "month", id: monthId(now) },
  ];
}

/**
 * Add to a period inside a transaction: create the row if missing, lock it,
 * fold the sketch and counters in, write it back. Callers always touch day,
 * week and month in that order, so two transactions cannot deadlock.
 */
async function foldIntoPeriod(
  tx: Executor,
  target: { kind: PeriodKind; id: PeriodId },
  delta: { visits: number; hours: Record<string, number>; sketch: HyperLogLog },
): Promise<void> {
  await tx
    .insert(usagePeriods)
    .values({
      kind: target.kind,
      periodId: target.id,
      sketch: HyperLogLog.empty().toBytes(),
    })
    .onConflictDoNothing();
  const [row] = await tx
    .select({
      visits: usagePeriods.visits,
      hours: usagePeriods.hours,
      sketch: usagePeriods.sketch,
    })
    .from(usagePeriods)
    .where(
      and(
        eq(usagePeriods.kind, target.kind),
        eq(usagePeriods.periodId, target.id),
      ),
    )
    .for("update");
  if (!row) throw new Error(`Missing period ${target.kind}/${target.id}`);

  const sketch = HyperLogLog.from(row.sketch);
  sketch.merge(delta.sketch);
  const hours = { ...row.hours };
  for (const [hour, n] of Object.entries(delta.hours)) {
    hours[hour] = (hours[hour] ?? 0) + n;
  }
  await tx
    .update(usagePeriods)
    .set({
      visits: row.visits + delta.visits,
      hours,
      sketch: sketch.toBytes(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(usagePeriods.kind, target.kind),
        eq(usagePeriods.periodId, target.id),
      ),
    );
}

/**
 * Count one page load by an already-tokenised visitor (see visitor.ts). The
 * token is salted per period and folded into the day, week and month sketches;
 * the token itself is never written.
 */
export async function recordPageLoad(
  visitorToken: string,
  now: Date = new Date(),
  database: UsageDb = db,
): Promise<void> {
  const targets = currentPeriods(now);
  const salts = await Promise.all(
    targets.map((target) => ensureSalt(database, target.id)),
  );
  const hour = hourId(now);

  await database.transaction(async (tx) => {
    for (const [i, target] of targets.entries()) {
      const sketch = HyperLogLog.empty();
      sketch.add(fingerprint(salts[i] as Buffer, visitorToken));
      await foldIntoPeriod(tx, target, {
        visits: 1,
        hours: target.kind === "day" ? { [hour]: 1 } : {},
        sketch,
      });
    }
  });

  if (!startRecorded) {
    await recordStart(database, now);
    startRecorded = true;
  }
  if (now.getTime() - lastSweepAt > SWEEP_INTERVAL_MS) {
    lastSweepAt = now.getTime();
    // Housekeeping only: a failure here costs nothing that matters.
    sweepSalts(database, now).catch(() => {});
  }
}

/**
 * The named periods, in the order asked for, with zero rows for any that
 * hold no data, so a series stays continuous.
 */
export async function readPeriods(
  kind: PeriodKind,
  ids: readonly PeriodId[],
  database: UsageDb = db,
): Promise<PeriodRow[]> {
  if (ids.length === 0) return [];
  const rows = await database
    .select({
      periodId: usagePeriods.periodId,
      visits: usagePeriods.visits,
      hours: usagePeriods.hours,
      sketch: usagePeriods.sketch,
    })
    .from(usagePeriods)
    .where(
      and(
        eq(usagePeriods.kind, kind),
        inArray(usagePeriods.periodId, [...ids]),
      ),
    );
  const byId = new Map(rows.map((row) => [row.periodId, row]));
  return ids.map((id) => {
    const row = byId.get(id);
    if (!row) return emptyPeriodRow(id);
    return {
      id,
      visits: row.visits,
      uniques: HyperLogLog.from(row.sketch).estimate(),
      hours: row.hours ?? {},
    };
  });
}

export type UsageCollection = {
  startedAt: Date | null;
  backfilledAt: Date | null;
  backfillThrough: Date | null;
  backfillVisits: number | null;
};

export async function readCollection(
  database: Executor = db,
): Promise<UsageCollection | null> {
  const [row] = await database
    .select({
      startedAt: usageCollection.startedAt,
      backfilledAt: usageCollection.backfilledAt,
      backfillThrough: usageCollection.backfillThrough,
      backfillVisits: usageCollection.backfillVisits,
    })
    .from(usageCollection)
    .where(eq(usageCollection.id, true));
  return row ?? null;
}

/** Everything the Nutzung page shows. */
export async function readSummary(
  now: Date = new Date(),
  database: UsageDb = db,
): Promise<UsageSummary> {
  const [days, weeks, months, collection] = await Promise.all([
    readPeriods("day", recentPeriodIds("day", SUMMARY_DAYS, now), database),
    readPeriods("week", recentPeriodIds("week", SUMMARY_WEEKS, now), database),
    readPeriods(
      "month",
      recentPeriodIds("month", SUMMARY_MONTHS, now),
      database,
    ),
    readCollection(database),
  ]);
  return buildSummary({
    days,
    weeks,
    months,
    startedAt: collection?.startedAt ?? null,
    now,
  });
}

// No parameter property: scripts/backfill-usage.ts loads this module through
// Node's type stripping, which rejects TypeScript-only runtime syntax.
export class BackfillAlreadyApplied extends Error {
  readonly collection: UsageCollection;

  constructor(collection: UsageCollection) {
    super(
      `Backfill already applied ${collection.backfilledAt?.toISOString()} (${collection.backfillVisits} visits through ${collection.backfillThrough?.toISOString()})`,
    );
    this.collection = collection;
  }
}

export type BackfillMarker = {
  appliedAt: Date;
  throughIso: string;
  periods: number;
  visits: number;
  earliestDay: PeriodId | null;
};

/**
 * Fold replayed history into the counters. One-shot by construction: the
 * counters are additive, so running twice would silently double every
 * historic day. The marker is claimed under a row lock first, so two callers
 * racing cannot both believe they were first, and the whole replay is one
 * transaction: either all of it lands with the marker or none of it does.
 *
 * Visitors arrive as opaque tokens and are salted here exactly as a live
 * visitor is, which is what makes someone present in both sources one person
 * rather than two on the boundary day.
 */
export async function applyBackfill(
  database: UsageDb,
  payload: BackfillPayload,
  now: Date = new Date(),
): Promise<BackfillMarker> {
  return database.transaction(async (tx) => {
    await tx.insert(usageCollection).values({ id: true }).onConflictDoNothing();
    const [collection] = await tx
      .select({
        startedAt: usageCollection.startedAt,
        backfilledAt: usageCollection.backfilledAt,
        backfillThrough: usageCollection.backfillThrough,
        backfillVisits: usageCollection.backfillVisits,
      })
      .from(usageCollection)
      .where(eq(usageCollection.id, true))
      .for("update");
    if (collection?.backfilledAt) throw new BackfillAlreadyApplied(collection);

    const days = payload.periods.filter((p) => p.kind === "day");
    const visits = days.reduce((sum, p) => sum + p.visits, 0);
    const earliestDay = days.map((p) => p.id).sort()[0] ?? null;

    for (const period of payload.periods) {
      const salt = await ensureSalt(tx, period.id);
      const sketch = HyperLogLog.empty();
      for (const token of period.visitors) {
        if (isVisitorToken(token)) sketch.add(fingerprint(salt, token));
      }
      await foldIntoPeriod(
        tx,
        { kind: period.kind, id: period.id },
        { visits: period.visits, hours: period.hours ?? {}, sketch },
      );
    }

    // The record now reaches back further than the day counting began, so
    // the page should say so rather than marking replayed days "no data".
    // An ISO string, not a Date: inside a raw fragment the driver gets the
    // value as-is, and it cannot serialise a Date on its own.
    const earliest = earliestDay ? `${earliestDay}T00:00:00.000Z` : null;
    await tx
      .update(usageCollection)
      .set({
        backfilledAt: now,
        backfillThrough: new Date(payload.throughIso),
        backfillVisits: visits,
        ...(earliest
          ? {
              startedAt: sql`least(${usageCollection.startedAt}, ${earliest}::timestamptz)`,
            }
          : {}),
      })
      .where(eq(usageCollection.id, true));

    return {
      appliedAt: now,
      throughIso: payload.throughIso,
      periods: payload.periods.length,
      visits,
      earliestDay,
    };
  });
}
