import type { MatchdayLite } from "./dashboard";

// "Spieltag 7" for a regular round, "Woche 1" for the first week after the
// regular season; the pager's chip says "7" and "W1".
export function weekNames(
  matchdays: readonly (MatchdayLite & { regular?: boolean })[],
): Map<number, { name: string; chip: string }> {
  const names = new Map<number, { name: string; chip: string }>();
  let extra = 0;
  for (const matchday of [...matchdays].sort((a, b) => a.round - b.round)) {
    if (matchday.regular === false) {
      extra++;
      names.set(matchday.round, { name: `Woche ${extra}`, chip: `W${extra}` });
    } else {
      names.set(matchday.round, {
        name: `Spieltag ${matchday.round}`,
        chip: String(matchday.round),
      });
    }
  }
  return names;
}
