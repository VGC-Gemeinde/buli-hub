import {
  dayId,
  hourId,
  monthId,
  type PeriodId,
  type PeriodKind,
  weekId,
} from "./periods";
import { isBot, isPageLoadPath, visitorTokenForClient } from "./visitor";

// Reconstructing usage from Cloud Run's request logs.
//
// Counting only starts when the feature ships, but Cloud Run has been logging
// every request all along (url, address, agent) with 30 days of retention.
// That is the input the live counter consumes, so the history inside that
// window can be replayed into the same shape. The replay applies the *same*
// rules as the live path (`isPageLoadPath`, `isBot`) so backfilled days are
// comparable with counted ones rather than merely plausible. Addresses never
// leave the machine running this: a visitor becomes an opaque token here.
//
// Two things the logs have that the live counter never sees, both dropped:
// requests carrying `_rsc` (soft navigations and prefetches, which do not
// re-render the root layout where counting happens) and rows at or after the
// moment live counting began.

/** One request, as read from the logs. */
export interface LogRow {
  timestamp: string;
  url: string;
  ip: string;
  userAgent: string;
}

/** One period's reconstructed counts. */
export interface BackfillPeriod {
  kind: PeriodKind;
  id: PeriodId;
  visits: number;
  /** Day periods only. */
  hours?: Record<string, number>;
  /** Opaque per-visitor tokens; salted per period when applied. */
  visitors: string[];
}

export interface BackfillPayload {
  /** Replay stops here: everything from this instant on was counted live. */
  throughIso: string;
  periods: BackfillPeriod[];
}

export interface BackfillSummary {
  payload: BackfillPayload;
  visits: number;
  /** Rows dropped, by reason: worth seeing before trusting the numbers. */
  skipped: {
    bots: number;
    afterCutoff: number;
    softNavigations: number;
    notPageLoads: number;
    unparsable: number;
  };
}

interface Bucket {
  visits: number;
  hours: Record<string, number>;
  visitors: Set<string>;
}

function bucket(
  buckets: Map<string, Bucket>,
  kind: PeriodKind,
  id: PeriodId,
): Bucket {
  const key = `${kind}/${id}`;
  let found = buckets.get(key);
  if (!found) {
    found = { visits: 0, hours: {}, visitors: new Set() };
    buckets.set(key, found);
  }
  return found;
}

/** Replay log rows into per-period counts. */
export function aggregateLogRows(
  rows: readonly LogRow[],
  throughIso: string,
): BackfillSummary {
  const cutoff = new Date(throughIso).getTime();
  const buckets = new Map<string, Bucket>();
  const skipped = {
    bots: 0,
    afterCutoff: 0,
    softNavigations: 0,
    notPageLoads: 0,
    unparsable: 0,
  };
  let visits = 0;

  for (const row of rows) {
    const at = new Date(row.timestamp);
    if (Number.isNaN(at.getTime())) {
      skipped.unparsable++;
      continue;
    }
    if (at.getTime() >= cutoff) {
      skipped.afterCutoff++;
      continue;
    }
    if (isBot(row.userAgent)) {
      skipped.bots++;
      continue;
    }

    let url: URL;
    try {
      url = new URL(row.url);
    } catch {
      skipped.unparsable++;
      continue;
    }
    if (url.searchParams.has("_rsc")) {
      skipped.softNavigations++;
      continue;
    }
    if (!isPageLoadPath(url.pathname)) {
      skipped.notPageLoads++;
      continue;
    }

    const token = visitorTokenForClient(row.ip, row.userAgent);
    const hour = hourId(at);
    visits++;

    const day = bucket(buckets, "day", dayId(at));
    day.visits++;
    day.hours[hour] = (day.hours[hour] ?? 0) + 1;
    day.visitors.add(token);
    for (const [kind, id] of [
      ["week", weekId(at)],
      ["month", monthId(at)],
    ] as const) {
      const entry = bucket(buckets, kind, id);
      entry.visits++;
      entry.visitors.add(token);
    }
  }

  const periods: BackfillPeriod[] = [];
  for (const [key, entry] of buckets) {
    const slash = key.indexOf("/");
    const kind = key.slice(0, slash) as PeriodKind;
    const id = key.slice(slash + 1);
    periods.push({
      kind,
      id,
      visits: entry.visits,
      ...(kind === "day" ? { hours: entry.hours } : {}),
      visitors: [...entry.visitors],
    });
  }
  periods.sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id),
  );

  return { payload: { throughIso, periods }, visits, skipped };
}

/**
 * Parse gcloud's tab-separated CSV (`--format=csv[separator="\t"]`) into log
 * rows. gcloud wraps a field in double quotes when it contains the separator,
 * a quote or a newline, doubling embedded quotes, so a user agent with a `"`
 * in it must not shift the columns. Column order: timestamp, url, ip, agent.
 */
export function parseLogCsv(text: string): LogRow[] {
  const rows: LogRow[] = [];
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    fields.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    if (fields.length >= 2 && fields[0] && fields[1]) {
      rows.push({
        timestamp: fields[0],
        url: fields[1],
        ip: fields[2] ?? "",
        userAgent: fields[3] ?? "",
      });
    }
    fields.length = 0;
  };

  while (i < text.length) {
    const char = text[i] as string;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"' && field === "") {
      quoted = true;
    } else if (char === "\t") {
      endField();
    } else if (char === "\n") {
      endRow();
    } else if (char !== "\r") {
      field += char;
    }
    i++;
  }
  if (field !== "" || fields.length > 0) endRow();
  return rows;
}
