import { Calendar } from "buli-hub";
import type { ReactNode } from "react";

/* The calendar is deliberately German-locale (Monday-first, "Juli 2026",
 * Mo–So) regardless of the browser locale — see docs/decisions/german-time.md.
 *
 * Every date is a fixed literal: the capture clock is pinned to 2024-05-15, so
 * without an explicit `defaultMonth`/`today` the calendar would open on May
 * 2024 and the highlighted "heute" would sit in the wrong year. `new Date()`
 * is banned in previews anyway (it moves the render hash on every run). */

const HEUTE = new Date(2026, 6, 27); // Mo, 27.07.2026 — the league's "heute"
const JULI = new Date(2026, 6, 1);
const SPIELTAG_START = new Date(2026, 6, 20);
const SPIELTAG_ENDE = new Date(2026, 6, 26);
const SAISON_ENDE = new Date(2026, 7, 2);

/* In the app the calendar only ever appears inside the date picker's popover,
 * which shrink-wraps it (`w-auto rounded-md border bg-popover shadow-md`).
 * Bare in a wide card the absolutely-positioned month nav stretches to the
 * card's full width, far from the grid, so each cell gets the panel chrome. */
function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="w-fit rounded-md border bg-popover text-popover-foreground shadow-md">
      {children}
    </div>
  );
}

/** The picker's panel: one day picked for a Spieltermin. */
export function Spieltermin() {
  return (
    <Panel>
      <Calendar
        mode="single"
        selected={HEUTE}
        defaultMonth={JULI}
        today={HEUTE}
      />
    </Panel>
  );
}

/** A Spieltag is a whole week (Mo–So) — the range mode staff schedule with. */
export function Spieltagswoche() {
  return (
    <Panel>
      <Calendar
        mode="range"
        selected={{ from: SPIELTAG_START, to: SPIELTAG_ENDE }}
        defaultMonth={JULI}
        today={HEUTE}
      />
    </Panel>
  );
}

/** Deadline picking: everything before "heute" is greyed out and unclickable. */
export function VergangenheitGesperrt() {
  return (
    <Panel>
      <Calendar
        mode="single"
        disabled={{ before: HEUTE }}
        defaultMonth={JULI}
        today={HEUTE}
      />
    </Panel>
  );
}

/** Two months side by side for a range that crosses the month boundary. */
export function ZweiMonate() {
  return (
    <Panel>
      <Calendar
        mode="range"
        numberOfMonths={2}
        // Outside days off here: with two grids the same late-July days appear
        // in both, and a range spanning the boundary would highlight twice.
        showOutsideDays={false}
        selected={{ from: HEUTE, to: SAISON_ENDE }}
        defaultMonth={JULI}
        today={HEUTE}
      />
    </Panel>
  );
}
