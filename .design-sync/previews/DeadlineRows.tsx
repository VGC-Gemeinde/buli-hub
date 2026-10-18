import { DeadlineRows, useDeadlines } from "buli-hub";

/* The editable week calendar inside the two schedule dialogs ("Spielplan
 * erstellen" for the regular season, and the one for Relegation und
 * Playoffs). One row per week: name, first day, a deadline date picker, and
 * the week's length. Moving a deadline shifts every later week by the same
 * delta and flashes the shifted rows (not reachable statically). A week
 * longer than seven days gets its length in amber, so a planned break is
 * visible at a glance.
 *
 * The rows take a `useDeadlines` editor, so each cell is a tiny component
 * that owns one. The width matches the dialog's (sm:max-w-[640px]).
 */

function Calendar({
  start,
  deadlines,
  name,
}: {
  start: string;
  deadlines: string[];
  name: (index: number) => string;
}) {
  const editor = useDeadlines(deadlines);
  return (
    <div className="w-full max-w-xl">
      <DeadlineRows start={start} editor={editor} name={name} />
    </div>
  );
}

/** Regular season: Sunday deadlines, Spieltag 4 runs two weeks over a
 *  break (14 Tage in amber). */
export const HauptrundeMitPause = () => (
  <Calendar
    start="2026-08-31"
    deadlines={[
      "2026-09-06",
      "2026-09-13",
      "2026-09-20",
      "2026-10-04",
      "2026-10-11",
      "2026-10-18",
    ]}
    name={(index) => `Spieltag ${index + 1}`}
  />
);

/** The weeks after the last Spieltag, for Relegation und Playoffs: three
 *  regular weeks. */
export const RelegationUndPlayoffs = () => (
  <Calendar
    start="2026-11-09"
    deadlines={["2026-11-15", "2026-11-22", "2026-11-29"]}
    name={(index) => `Woche ${index + 1}`}
  />
);
