import { z } from "zod";
import { roundCount } from "./round-robin";

// The Spieltag calendar maths. Dates are calendar days as `YYYY-MM-DD` strings
// (matching the Postgres `date` columns); all arithmetic is whole-day and
// UTC-based, so it is DST-safe and deterministic. The editable representation
// is the list of week deadlines (`ends_on`); each week's start is derived
// (week 1 = the season start, later weeks = previous deadline + 1 day).

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type Spielwoche = { start: string; end: string };

// Type-to-confirm phrase for the terminal generate gate — names the action.
export const SCHEDULE_CONFIRMATION_PHRASE = "Spielplan erstellen";

function toUtcMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  return toIso(toUtcMs(iso) + days * DAY_MS);
}

function daysBetween(fromIso: string, toIsoStr: string): number {
  return Math.round((toUtcMs(toIsoStr) - toUtcMs(fromIso)) / DAY_MS);
}

// "Spieltag 1", "Spieltag 2", …
export function matchdayName(round: number): string {
  return `Spieltag ${round}`;
}

// The number of Spielwochen a season needs: the most rounds any group needs
// (the largest group). `0` when there are no groups.
export function spieltagCount(groupSizes: readonly number[]): number {
  if (groupSizes.length === 0) {
    return 0;
  }
  return Math.max(...groupSizes.map(roundCount));
}

// The first Sunday at least `minDays` away from `from` (0 = Sunday). The default
// deadline for Spielwoche 1: the first Sunday that gives the week ≥ 7 days.
export function nextSundayAtLeast(from: string, minDays = 7): string {
  const earliest = addDays(from, minDays);
  const dow = new Date(toUtcMs(earliest)).getUTCDay();
  return addDays(earliest, (7 - dow) % 7);
}

// Default week deadlines for a season starting at `seasonStart`: the first is
// `nextSundayAtLeast(seasonStart, 7)`, each following week a further 7 days.
export function defaultDeadlines(seasonStart: string, count: number): string[] {
  if (count <= 0) {
    return [];
  }
  const first = nextSundayAtLeast(seasonStart, 7);
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}

// Set week `index`'s deadline to `newEnd` and shift every later week by the same
// delta — extending one week cleanly pushes the rest of the season back.
export function shiftDeadlineFrom(
  deadlines: readonly string[],
  index: number,
  newEnd: string,
): string[] {
  const delta = daysBetween(deadlines[index], newEnd);
  return deadlines.map((deadline, i) => {
    if (i < index) {
      return deadline;
    }
    if (i === index) {
      return newEnd;
    }
    return addDays(deadline, delta);
  });
}

// Derive the display windows from the season start + deadlines: week 1 starts at
// the season start, each later week the day after the previous deadline.
export function windowsFromDeadlines(
  seasonStart: string,
  deadlines: readonly string[],
): Spielwoche[] {
  return deadlines.map((end, i) => ({
    start: i === 0 ? seasonStart : addDays(deadlines[i - 1], 1),
    end,
  }));
}

// A non-empty, strictly ascending list of calendar-day deadlines.
export const spieltagDeadlinesSchema = z
  .array(z.string().regex(ISO_DATE, "Ungültiges Datum"))
  .min(1, "Mindestens ein Spieltag")
  .refine(
    (deadlines) =>
      deadlines.every((deadline, i) => i === 0 || deadlines[i - 1] < deadline),
    { message: "Die Spieltage müssen aufsteigend sein" },
  );
