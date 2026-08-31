import { formatGermanDateTime, formatGermanDay } from "@/lib/german-time";
import {
  dayId,
  hourId,
  type PeriodId,
  type PeriodKind,
  periodIdFor,
} from "./periods";

// Shapes stored rows into what the Nutzung page shows. Pure, so the view
// model is unit-tested and the components stay dumb.

/** One stored period on its way out of the store (zeros when nothing exists). */
export type PeriodRow = {
  id: PeriodId;
  visits: number;
  uniques: number;
  /** Day rows only: page loads per Berlin hour, keyed "00".."23". */
  hours: Record<string, number>;
};

export type SummaryPeriod = {
  id: PeriodId;
  /** Human label: "31.08.2026", "KW 36 · 2026", "August 2026". */
  label: string;
  visits: number;
  uniques: number;
  /** False for a period from before counting began: unknown, not empty. */
  counted: boolean;
};

export type SummaryHour = {
  /** "00".."23" */
  hour: string;
  label: string;
  visits: number;
  counted: boolean;
};

export type UsageSummary = {
  generatedAt: Date;
  /** Null until the first page load has been counted. */
  startedAt: Date | null;
  today: { visits: number; uniques: number };
  week: { visits: number; uniques: number };
  month: { visits: number; uniques: number };
  hours: SummaryHour[];
  days: SummaryPeriod[];
  weeks: SummaryPeriod[];
  months: SummaryPeriod[];
};

export function emptyPeriodRow(id: PeriodId): PeriodRow {
  return { id, visits: 0, uniques: 0, hours: {} };
}

const MONTHS_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export function periodLabel(kind: PeriodKind, id: PeriodId): string {
  if (kind === "day") {
    return formatGermanDay(id, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  if (kind === "week") {
    const [year, week] = id.split("-W");
    return `KW ${Number(week)} · ${year}`;
  }
  const [year, month] = id.split("-");
  return `${MONTHS_DE[Number(month) - 1] ?? month} ${year}`;
}

/** Short label for a chart bar: "31.08." */
export function dayBarLabel(id: PeriodId): string {
  return formatGermanDay(id, { day: "2-digit", month: "2-digit" });
}

/**
 * Tag each period with whether it was actually being counted.
 *
 * A period with no row reads as zero, which is right for a quiet day and wrong
 * for the days before any of this existed. Ids sort chronologically within a
 * kind, so "counted" is "at or after the period containing the first count".
 * Visits are proof in themselves: a period holding data was being counted,
 * whatever the marker says, which keeps backfilled periods from being written
 * off as "no data".
 */
export function series(
  kind: PeriodKind,
  rows: readonly PeriodRow[],
  startedAt: Date | null,
): SummaryPeriod[] {
  const first = startedAt ? periodIdFor(kind, startedAt) : null;
  return rows.map((row) => ({
    id: row.id,
    label: periodLabel(kind, row.id),
    visits: row.visits,
    uniques: row.uniques,
    counted: row.visits > 0 || (first !== null && row.id >= first),
  }));
}

/**
 * Today's 24 Berlin hours. Counting may have begun partway through today (or
 * not at all), in which case the earlier hours are unknown rather than empty.
 */
export function hoursOfDay(
  today: PeriodRow | undefined,
  startedAt: Date | null,
  now: Date,
): SummaryHour[] {
  const todayId = dayId(now);
  const startedDay = startedAt ? dayId(startedAt) : null;
  const startedHour = startedAt ? hourId(startedAt) : null;
  return Array.from({ length: 24 }, (_, i) => {
    const hour = String(i).padStart(2, "0");
    const visits = today?.hours[hour] ?? 0;
    let counted = visits > 0;
    if (!counted && startedDay !== null && startedHour !== null) {
      counted =
        startedDay < todayId || (startedDay === todayId && hour >= startedHour);
    }
    return { hour, label: `${hour}:00`, visits, counted };
  });
}

function totals(row: PeriodRow | undefined): {
  visits: number;
  uniques: number;
} {
  return { visits: row?.visits ?? 0, uniques: row?.uniques ?? 0 };
}

export function buildSummary(input: {
  days: readonly PeriodRow[];
  weeks: readonly PeriodRow[];
  months: readonly PeriodRow[];
  startedAt: Date | null;
  now: Date;
}): UsageSummary {
  const { days, weeks, months, startedAt, now } = input;
  const today = days.find((row) => row.id === periodIdFor("day", now));
  return {
    generatedAt: now,
    startedAt,
    today: totals(today),
    week: totals(weeks.find((row) => row.id === periodIdFor("week", now))),
    month: totals(months.find((row) => row.id === periodIdFor("month", now))),
    hours: hoursOfDay(today, startedAt, now),
    days: series("day", days, startedAt),
    weeks: series("week", weeks, startedAt),
    months: series("month", months, startedAt),
  };
}

/** "Gezählt seit 01.08.2026 · deutsche Zeit · Stand 31.08.2026, 14:03" */
export function summaryMetaLine(summary: UsageSummary): string {
  const generated = formatGermanDateTime(summary.generatedAt, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const since = summary.startedAt
    ? `Gezählt seit ${formatGermanDateTime(summary.startedAt, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })}`
    : "Noch nichts gezählt";
  return `${since} · deutsche Zeit · Stand ${generated}`;
}
