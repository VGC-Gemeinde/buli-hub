import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { usageCollection, usagePeriods, usageSalts } from "@/db/schema";
import { db } from "@/lib/db";
import type { BackfillPayload } from "./backfill";
import { HyperLogLog } from "./hll";
import {
  applyBackfill,
  BackfillAlreadyApplied,
  ensureSalt,
  readCollection,
  readPeriods,
  readSummary,
  recordPageLoad,
  resetUsageCache,
  sweepSalts,
} from "./store";
import { visitorTokenForClient, visitorTokenForUser } from "./visitor";

// Integration tests against the local Supabase Postgres (stack must be
// running). The usage tables are global aggregates, so the file owns their
// state: start clean, and clean up afterwards.

async function clean() {
  await db.execute(sql`truncate usage_periods, usage_salts, usage_collection`);
  resetUsageCache();
}

beforeAll(clean);
afterAll(clean);
beforeEach(clean);

const at = (iso: string) => new Date(iso);
const NOON = at("2026-08-12T10:00:00Z"); // 12:00 Berlin, Wednesday
const alice = visitorTokenForUser("alice");
const bob = visitorTokenForUser("bob");

async function period(kind: "day" | "week" | "month", id: string) {
  const [row] = await db
    .select()
    .from(usagePeriods)
    .where(and(eq(usagePeriods.kind, kind), eq(usagePeriods.periodId, id)));
  return row ?? null;
}

describe("recordPageLoad", () => {
  it("counts against the Berlin day, week and month at once", async () => {
    await recordPageLoad(alice, NOON);
    const day = await period("day", "2026-08-12");
    expect(day).toMatchObject({ visits: 1, hours: { "12": 1 } });
    expect(HyperLogLog.from(day?.sketch).estimate()).toBe(1);
    expect(await period("week", "2026-W33")).toMatchObject({
      visits: 1,
      hours: {},
    });
    expect(await period("month", "2026-08")).toMatchObject({ visits: 1 });
    expect(await period("day", "2026-08-11")).toBeNull();
  });

  it("counts a returning visitor as many loads but one person", async () => {
    for (let i = 0; i < 5; i++) {
      await recordPageLoad(alice, at(`2026-08-12T${10 + i}:00:00Z`));
    }
    const day = await period("day", "2026-08-12");
    expect(day?.visits).toBe(5);
    expect(day?.hours).toEqual({ "12": 1, "13": 1, "14": 1, "15": 1, "16": 1 });
    expect(HyperLogLog.from(day?.sketch).estimate()).toBe(1);
  });

  it("tells people apart, signed in or not", async () => {
    await recordPageLoad(alice, NOON);
    await recordPageLoad(bob, NOON);
    await recordPageLoad(visitorTokenForClient("203.0.113.9", "Safari"), NOON);
    const [row] = await readPeriods("day", ["2026-08-12"]);
    expect(row).toMatchObject({ visits: 3, uniques: 3 });
  });

  it("loses nothing under concurrent loads", async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        recordPageLoad(visitorTokenForUser(`user-${i}`), NOON),
      ),
    );
    const [day] = await readPeriods("day", ["2026-08-12"]);
    expect(day?.visits).toBe(20);
    // Linear counting is exact unless two of the twenty land in one register.
    expect(day?.uniques).toBeGreaterThanOrEqual(19);
    expect(day?.uniques).toBeLessThanOrEqual(20);
    expect((await period("week", "2026-W33"))?.visits).toBe(20);
  });

  it("stamps the start of counting once and never moves it later", async () => {
    await recordPageLoad(alice, at("2026-08-12T10:00:00Z"));
    expect((await readCollection())?.startedAt).toEqual(
      at("2026-08-12T10:00:00Z"),
    );
    // A fresh process (cache cleared) recording later must not move it.
    resetUsageCache();
    await recordPageLoad(alice, at("2026-08-13T10:00:00Z"));
    expect((await readCollection())?.startedAt).toEqual(
      at("2026-08-12T10:00:00Z"),
    );
  });
});

describe("salts", () => {
  it("are created once per period and shared afterwards", async () => {
    const first = await ensureSalt(db, "2026-08-12");
    expect(first.length).toBe(32);
    resetUsageCache(); // another instance asks
    const second = await ensureSalt(db, "2026-08-12");
    expect(second.equals(first)).toBe(true);
    const other = await ensureSalt(db, "2026-W33");
    expect(other.equals(first)).toBe(false);
  });

  it("are swept 70 days after creation", async () => {
    await ensureSalt(db, "2026-05-01");
    await ensureSalt(db, "2026-08-12");
    await db
      .update(usageSalts)
      .set({ createdAt: at("2026-05-01T00:00:00Z") })
      .where(eq(usageSalts.periodId, "2026-05-01"));
    await sweepSalts(db, NOON);
    const left = await db.select({ id: usageSalts.periodId }).from(usageSalts);
    expect(left.map((r) => r.id)).toEqual(["2026-08-12"]);
  });
});

describe("readPeriods", () => {
  it("returns the named periods in order, zeros where nothing exists", async () => {
    await recordPageLoad(alice, NOON);
    const rows = await readPeriods("day", [
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
    ]);
    expect(rows.map((r) => [r.id, r.visits, r.uniques])).toEqual([
      ["2026-08-11", 0, 0],
      ["2026-08-12", 1, 1],
      ["2026-08-13", 0, 0],
    ]);
    expect(await readPeriods("day", [])).toEqual([]);
  });
});

describe("readSummary", () => {
  it("composes the page's view model from the store", async () => {
    await recordPageLoad(alice, NOON);
    await recordPageLoad(bob, NOON);
    const summary = await readSummary(at("2026-08-12T15:00:00Z"));
    expect(summary.today).toEqual({ visits: 2, uniques: 2 });
    expect(summary.week).toEqual({ visits: 2, uniques: 2 });
    expect(summary.month).toEqual({ visits: 2, uniques: 2 });
    expect(summary.hours[12]?.visits).toBe(2);
    expect(summary.hours[11]?.counted).toBe(false); // before the first count
    expect(summary.days).toHaveLength(30);
    expect(summary.days.at(-1)?.counted).toBe(true);
    expect(summary.days.at(-2)?.counted).toBe(false);
    expect(summary.startedAt).toEqual(NOON);
  });
});

describe("applyBackfill", () => {
  const payload: BackfillPayload = {
    throughIso: "2026-08-12T10:00:00Z",
    periods: [
      {
        kind: "day",
        id: "2026-08-10",
        visits: 7,
        hours: { "20": 7 },
        visitors: [alice, bob],
      },
      {
        kind: "day",
        id: "2026-08-12",
        visits: 3,
        hours: { "08": 3 },
        visitors: [alice],
      },
      {
        kind: "week",
        id: "2026-W33",
        visits: 10,
        visitors: [alice, bob],
      },
      {
        kind: "month",
        id: "2026-08",
        visits: 10,
        visitors: [alice, bob],
      },
    ],
  };

  it("adds history onto what was counted live and moves the start back", async () => {
    await recordPageLoad(alice, NOON);
    await recordPageLoad(bob, NOON);

    const marker = await applyBackfill(db, payload, at("2026-08-12T11:00:00Z"));
    expect(marker).toMatchObject({
      visits: 10,
      periods: 4,
      earliestDay: "2026-08-10",
    });

    const [day10, day12] = await readPeriods("day", [
      "2026-08-10",
      "2026-08-12",
    ]);
    expect(day10).toMatchObject({ visits: 7, uniques: 2, hours: { "20": 7 } });
    // The boundary day merges: 3 replayed + 2 live loads, alice once.
    expect(day12).toMatchObject({
      visits: 5,
      uniques: 2,
      hours: { "08": 3, "12": 2 },
    });
    const [week] = await readPeriods("week", ["2026-W33"]);
    expect(week).toMatchObject({ visits: 12, uniques: 2 });

    const collection = await readCollection();
    expect(collection?.startedAt).toEqual(at("2026-08-10T00:00:00Z"));
    expect(collection?.backfilledAt).toEqual(at("2026-08-12T11:00:00Z"));
    expect(collection?.backfillThrough).toEqual(at("2026-08-12T10:00:00Z"));
    expect(collection?.backfillVisits).toBe(10);
  });

  it("works on an empty store and refuses to run twice", async () => {
    await applyBackfill(db, payload);
    expect((await readCollection())?.startedAt).toEqual(
      at("2026-08-10T00:00:00Z"),
    );
    await expect(applyBackfill(db, payload)).rejects.toBeInstanceOf(
      BackfillAlreadyApplied,
    );
    const [day10] = await readPeriods("day", ["2026-08-10"]);
    expect(day10?.visits).toBe(7);
  });

  it("ignores anything that is not a visitor token", async () => {
    await applyBackfill(db, {
      throughIso: "2026-08-12T10:00:00Z",
      periods: [
        {
          kind: "day",
          id: "2026-08-10",
          visits: 2,
          visitors: [alice, "203.0.113.9", "not-a-token"],
        },
      ],
    });
    const [day] = await readPeriods("day", ["2026-08-10"]);
    expect(day).toMatchObject({ visits: 2, uniques: 1 });
  });

  it("leaves nothing behind when it fails midway", async () => {
    await expect(
      applyBackfill(db, {
        throughIso: "2026-08-12T10:00:00Z",
        periods: [
          { kind: "day", id: "2026-08-10", visits: 2, visitors: [alice] },
          // An invalid kind fails the enum cast inside the transaction.
          { kind: "year" as "day", id: "2026", visits: 1, visitors: [alice] },
        ],
      }),
    ).rejects.toThrow();
    expect(await period("day", "2026-08-10")).toBeNull();
    expect((await readCollection())?.backfilledAt ?? null).toBeNull();
    const rows = await db.select().from(usageCollection);
    expect(rows.length).toBeLessThanOrEqual(1);
  });
});
