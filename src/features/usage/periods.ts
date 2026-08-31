import { GERMAN_TZ, germanToday } from "@/lib/german-time";

// Period ids for the usage counters, all on German time
// (docs/decisions/german-time.md): a match evening that ends 23:30 belongs to
// that Berlin day, not to the next UTC one. Ids sort chronologically within
// their kind, which the summary relies on ("counted from this period on").

export type PeriodKind = "day" | "week" | "month";
/** `2026-08-31` (day), `2026-W36` (ISO week) or `2026-08` (month). */
export type PeriodId = string;

const DAY_MS = 86_400_000;

function parseDay(day: string): { y: number; m: number; d: number } {
  const [y, m, d] = day.split("-").map(Number);
  return { y: y ?? 0, m: m ?? 1, d: d ?? 1 };
}

// Calendar arithmetic happens on the day string, anchored in UTC, so a DST
// change (a 23- or 25-hour day) can never skip or repeat a period.
function dayAt(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}

function dayToUtc(day: string): number {
  const { y, m, d } = parseDay(day);
  return Date.UTC(y, m - 1, d);
}

/** The Berlin calendar day containing `at`. */
export function dayId(at: Date = new Date()): PeriodId {
  return germanToday(at);
}

/**
 * ISO-8601 week of a day string: weeks run Monday to Sunday and belong to
 * the year containing their Thursday, so `2026-W01` means the same span to
 * everyone (and 2026-12-31 is `2026-W53`).
 */
export function weekIdOfDay(day: string): PeriodId {
  const date = new Date(dayToUtc(day));
  const weekday = date.getUTCDay() || 7; // Sunday counts as 7
  date.setUTCDate(date.getUTCDate() + 4 - weekday); // this week's Thursday
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function weekId(at: Date = new Date()): PeriodId {
  return weekIdOfDay(dayId(at));
}

export function monthIdOfDay(day: string): PeriodId {
  return day.slice(0, 7);
}

export function monthId(at: Date = new Date()): PeriodId {
  return monthIdOfDay(dayId(at));
}

/** The id of the period of `kind` that contains `at`. */
export function periodIdFor(kind: PeriodKind, at: Date): PeriodId {
  if (kind === "day") return dayId(at);
  if (kind === "week") return weekId(at);
  return monthId(at);
}

/** The Berlin hour of `at`, "00".."23". */
export function hourId(at: Date = new Date()): string {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: GERMAN_TZ,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(at);
  return hour.padStart(2, "0");
}

/**
 * The ids of the last `count` periods, oldest first and including the
 * current one: `2026-08-02 … 2026-08-31` for 30 days.
 *
 * The page asks for periods by name rather than for "the most recent N", so a
 * period nobody visited comes back as a zero instead of a hole in the chart.
 */
export function recentPeriodIds(
  kind: PeriodKind,
  count: number,
  now: Date = new Date(),
): PeriodId[] {
  const today = dayId(now);
  const ids: PeriodId[] = [];
  for (let back = count - 1; back >= 0; back--) {
    if (kind === "month") {
      const { y, m } = parseDay(today);
      ids.push(monthIdOfDay(dayAt(Date.UTC(y, m - 1 - back, 1))));
    } else {
      const days = kind === "week" ? back * 7 : back;
      const day = dayAt(dayToUtc(today) - days * DAY_MS);
      ids.push(kind === "week" ? weekIdOfDay(day) : day);
    }
  }
  return ids;
}
