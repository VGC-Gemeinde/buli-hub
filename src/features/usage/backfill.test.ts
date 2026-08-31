import { describe, expect, it } from "vitest";
import { aggregateLogRows, type LogRow, parseLogCsv } from "./backfill";
import { visitorTokenForClient } from "./visitor";

const SAFARI = "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15";
const FIREFOX = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Firefox/128.0";
const BASE = "https://buli.vgcgemein.de";

const logRow = (
  timestamp: string,
  path: string,
  ip = "203.0.113.9",
  userAgent = SAFARI,
): LogRow => ({ timestamp, url: `${BASE}${path}`, ip, userAgent });

const CUTOFF = "2026-08-20T10:00:00Z";

describe("aggregateLogRows", () => {
  it("buckets page loads by Berlin day, hour, week and month", () => {
    const { payload, visits, skipped } = aggregateLogRows(
      [
        logRow("2026-08-12T07:15:00Z", "/"),
        logRow("2026-08-12T07:45:00Z", "/spieler"),
        // 22:30 UTC is already 00:30 on the 13th in Berlin.
        logRow("2026-08-12T22:30:00Z", "/match/abc"),
      ],
      CUTOFF,
    );
    expect(visits).toBe(3);
    expect(skipped).toEqual({
      bots: 0,
      afterCutoff: 0,
      softNavigations: 0,
      notPageLoads: 0,
      unparsable: 0,
    });
    const day12 = payload.periods.find(
      (p) => p.kind === "day" && p.id === "2026-08-12",
    );
    const day13 = payload.periods.find(
      (p) => p.kind === "day" && p.id === "2026-08-13",
    );
    expect(day12).toMatchObject({ visits: 2, hours: { "09": 2 } });
    expect(day13).toMatchObject({ visits: 1, hours: { "00": 1 } });
    expect(payload.periods.find((p) => p.kind === "week")).toMatchObject({
      id: "2026-W33",
      visits: 3,
    });
    expect(payload.periods.find((p) => p.kind === "month")).toMatchObject({
      id: "2026-08",
      visits: 3,
    });
    expect(
      payload.periods.find((p) => p.kind === "week")?.hours,
    ).toBeUndefined();
  });

  it("keeps one token per visitor and period, never an address", () => {
    const { payload } = aggregateLogRows(
      [
        logRow("2026-08-12T07:15:00Z", "/"),
        logRow("2026-08-12T08:15:00Z", "/spieler"),
        logRow("2026-08-12T09:15:00Z", "/", "203.0.113.9", FIREFOX),
        logRow("2026-08-12T09:15:00Z", "/", "198.51.100.4"),
      ],
      CUTOFF,
    );
    const day = payload.periods.find((p) => p.kind === "day");
    expect(day?.visits).toBe(4);
    expect(day?.visitors).toHaveLength(3);
    expect(day?.visitors).toContain(
      visitorTokenForClient("203.0.113.9", SAFARI),
    );
    expect(JSON.stringify(payload)).not.toContain("203.0.113.9");
    expect(JSON.stringify(payload)).not.toContain("Safari");
  });

  it("drops what the live counter never sees, and says why", () => {
    const { payload, visits, skipped } = aggregateLogRows(
      [
        logRow("2026-08-12T07:15:00Z", "/", "1.2.3.4", "Googlebot/2.1"),
        logRow("2026-08-12T07:15:00Z", "/", "1.2.3.4", ""),
        logRow("2026-08-21T07:15:00Z", "/"), // after live counting began
        logRow("2026-08-20T10:00:00Z", "/"), // exactly at the cutoff: live
        logRow("2026-08-12T07:15:00Z", "/spieler?_rsc=1abc2"),
        logRow("2026-08-12T07:15:00Z", "/api/health"),
        logRow("2026-08-12T07:15:00Z", "/wp-login.php"),
        logRow("2026-08-12T07:15:00Z", "/staff/nutzung"),
        logRow("not a date", "/"),
        {
          timestamp: "2026-08-12T07:15:00Z",
          url: "nonsense",
          ip: "",
          userAgent: SAFARI,
        },
        logRow("2026-08-12T07:15:00Z", "/regelwerk?utm=discord"),
      ],
      CUTOFF,
    );
    expect(visits).toBe(1);
    expect(payload.periods.find((p) => p.kind === "day")?.id).toBe(
      "2026-08-12",
    );
    expect(skipped).toEqual({
      bots: 2,
      afterCutoff: 2,
      softNavigations: 1,
      notPageLoads: 3,
      unparsable: 2,
    });
  });

  it("orders periods by kind and id, and carries the cutoff", () => {
    const { payload } = aggregateLogRows(
      [
        logRow("2026-08-14T07:15:00Z", "/"),
        logRow("2026-08-12T07:15:00Z", "/"),
        logRow("2026-07-30T07:15:00Z", "/"),
      ],
      CUTOFF,
    );
    expect(payload.throughIso).toBe(CUTOFF);
    expect(payload.periods.map((p) => `${p.kind}/${p.id}`)).toEqual([
      "day/2026-07-30",
      "day/2026-08-12",
      "day/2026-08-14",
      "month/2026-07",
      "month/2026-08",
      "week/2026-W31",
      "week/2026-W33",
    ]);
  });

  it("returns nothing for no rows", () => {
    const { payload, visits } = aggregateLogRows([], CUTOFF);
    expect(visits).toBe(0);
    expect(payload.periods).toEqual([]);
  });
});

describe("parseLogCsv", () => {
  it("reads tab-separated rows in column order", () => {
    const rows = parseLogCsv(
      `2026-08-12T07:15:00Z\t${BASE}/\t203.0.113.9\t${SAFARI}\n` +
        `2026-08-12T07:16:00Z\t${BASE}/spieler\t203.0.113.10\t${FIREFOX}\n`,
    );
    expect(rows).toEqual([
      {
        timestamp: "2026-08-12T07:15:00Z",
        url: `${BASE}/`,
        ip: "203.0.113.9",
        userAgent: SAFARI,
      },
      {
        timestamp: "2026-08-12T07:16:00Z",
        url: `${BASE}/spieler`,
        ip: "203.0.113.10",
        userAgent: FIREFOX,
      },
    ]);
  });

  it("honours gcloud's quoting, so a strange user agent cannot shift columns", () => {
    const rows = parseLogCsv(
      `2026-08-12T07:15:00Z\t${BASE}/\t203.0.113.9\t"Agent with\ttab and ""quotes"""\r\n` +
        `2026-08-12T07:16:00Z\t${BASE}/\t203.0.113.9\t`,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.userAgent).toBe('Agent with\ttab and "quotes"');
    expect(rows[0]?.ip).toBe("203.0.113.9");
    expect(rows[1]?.userAgent).toBe("");
  });

  it("skips blank and truncated lines", () => {
    const rows = parseLogCsv(
      `\n2026-08-12T07:15:00Z\n\n2026-08-12T07:15:00Z\t${BASE}/\n`,
    );
    expect(rows).toHaveLength(1);
  });
});
