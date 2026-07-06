// The league runs on German time (docs/decisions/german-time.md): every
// day-based domain decision (matchday windows, deadlines, the „current
// Spieltag") uses the Europe/Berlin calendar day, and every displayed
// timestamp renders in Europe/Berlin — regardless of the server's timezone
// (UTC on Cloud Run) or the visitor's. Day strings (YYYY-MM-DD) in the
// database are plain calendar days with no timezone of their own.

export const GERMAN_TZ = "Europe/Berlin";

// Today as YYYY-MM-DD in German time. `now` is injectable for tests; the
// en-CA locale formats ISO-style.
export function germanToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: GERMAN_TZ,
  }).format(now);
}

// A timestamp rendered in German time, German locale.
export function formatGermanDateTime(
  date: Date,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("de-DE", {
    ...options,
    timeZone: GERMAN_TZ,
  }).format(date);
}

// A YYYY-MM-DD day string rendered as a date. Day strings are already
// calendar days — the UTC anchor is pinned so no server or browser timezone
// can shift the displayed day.
export function formatGermanDay(
  dateStr: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("de-DE", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${dateStr}T00:00:00Z`));
}
