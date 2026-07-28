import { InSeasonDashboard } from "buli-hub";
import type { MatchResultLite } from "@/features/reporting/queries";
import type { StandingsRow } from "@/features/reporting/standings";
import { assignZones } from "@/features/seeding/post-season";
import {
  DIVISION_STANDINGS,
  PLAYER_MATCHES,
  STANDINGS,
} from "./_fixtures";

/* The whole running-season Spieler-Dashboard: progress strip → hero (next match
 * or its result) → „Dein Spielplan" + „Tabelle" side by side. Wide by nature —
 * cfg.overrides gives it cardMode:"column" and a 1120x900 viewport so the
 * two-column lg layout renders instead of stacking.
 *
 * `today` is an explicit ISO day, never `new Date()`: the whole hero (Deadline,
 * „noch N Tage", überfällig) and every schedule row state derives from it, and
 * the capture pins the browser clock to 2024-05-15. The shared PLAYER_MATCHES
 * fixture runs 05.01.–01.02.2026, so 14.01. puts Spieltag 2 in flight.
 * Ported from the dev/ui gallery („Spieler-Dashboard"). */

const TODAY = "2026-01-14";

/* userId → zone for a standings fixture, so the table shows the post-season
 * tints without a saved config. Same helper the gallery uses. */
const zonesFor = (
  rows: StandingsRow[],
  counts: {
    champion?: number;
    promotions: number;
    promotionPlayoff: number;
    demotionPlayoff: number;
    demotions: number;
  },
) =>
  new Map(
    assignZones({ rowCount: rows.length, ...counts }).map((zone, i) => [
      rows[i].userId,
      zone,
    ]),
  );

/* Spieltag 1 is played and won 2:1; Spieltag 2 is the current match. */
const RESULTS = new Map<string, MatchResultLite>([
  [
    "m1",
    {
      matchId: "m1",
      outcome: "normal",
      winnerId: "me",
      confirmedAt: null,
      disputed: false,
      games: [{ winnerId: "me" }, { winnerId: "a" }, { winnerId: "me" }],
    },
  ],
]);

/* Spieltag 2 lost and the result angefochten — the row keeps the score and adds
 * the „Angefochten" chip. */
const LOST_AND_DISPUTED: [string, MatchResultLite] = [
  "m2",
  {
    matchId: "m2",
    outcome: "normal",
    winnerId: "b",
    confirmedAt: new Date("2026-01-17T19:30:00Z"),
    disputed: true,
    games: [{ winnerId: "b" }, { winnerId: "me" }, { winnerId: "b" }],
  },
];

/* Deadline day of Spieltag 3: the first two are decided, the current one is not. */
const ROUND_THREE_RESULTS = new Map<string, MatchResultLite>([
  ...RESULTS,
  LOST_AND_DISPUTED,
]);

/* End of the season: every Spieltag decided — a win, a loss, an angefochtenes
 * Ergebnis and a bestätigter Freewin. */
const FINAL_RESULTS = new Map<string, MatchResultLite>([
  ...RESULTS,
  LOST_AND_DISPUTED,
  [
    "m3",
    {
      matchId: "m3",
      outcome: "free_win",
      winnerId: "me",
      confirmedAt: new Date("2026-01-24T09:00:00Z"),
      disputed: false,
      games: [],
    },
  ],
]);

/* Division-Modus: Auf- und Abstieg wird über die Gesamttabelle entschieden, so
 * the switcher opens on „Division 1" and the zones sit on the merged table —
 * Meister-Playoff, Aufstieg, beide Playoff-Bänder, Abstieg. */
export function Gesamttabelle() {
  return (
    <InSeasonDashboard
      groupName="Division 1a"
      currentRound={2}
      totalRounds={4}
      next={PLAYER_MATCHES[1]}
      matches={PLAYER_MATCHES}
      resultByMatchId={RESULTS}
      standings={STANDINGS}
      divisionName="Division 1"
      divisionStandings={DIVISION_STANDINGS}
      divisionZones={zonesFor(DIVISION_STANDINGS, {
        champion: 1,
        promotions: 1,
        promotionPlayoff: 1,
        demotionPlayoff: 1,
        demotions: 1,
      })}
      divisionGroupLabels={
        new Map(
          DIVISION_STANDINGS.map((row, i) => [
            row.userId,
            i % 2 === 0 ? "1a" : "1b",
          ]),
        )
      }
      defaultScope="division"
      meId="me"
      today={TODAY}
    />
  );
}

/* Gruppen-Modus: entschieden wird innerhalb der eigenen Gruppe, so there is no
 * switcher at all and the zones sit on the four-player group table. Set one
 * matchday later and on the deadline day, which is also the hero's urgent
 * variant — „heute fällig" flips the chip to solid orange. */
export function Gruppentabelle() {
  return (
    <InSeasonDashboard
      groupName="Division 2b"
      currentRound={3}
      totalRounds={4}
      next={PLAYER_MATCHES[2]}
      matches={PLAYER_MATCHES}
      resultByMatchId={ROUND_THREE_RESULTS}
      standings={STANDINGS}
      groupZones={zonesFor(STANDINGS, {
        promotions: 1,
        promotionPlayoff: 0,
        demotionPlayoff: 0,
        demotions: 1,
      })}
      divisionName="Division 2"
      divisionStandings={null}
      defaultScope="group"
      meId="me"
      today="2026-01-25"
    />
  );
}

/* Nothing left to report: the hero drops the Deadline/Melden block for the
 * closing line, and every schedule row carries its final score. */
export function AlleSpieleGemeldet() {
  return (
    <InSeasonDashboard
      groupName="Division 1a"
      currentRound={4}
      totalRounds={4}
      next={null}
      matches={PLAYER_MATCHES}
      resultByMatchId={FINAL_RESULTS}
      standings={STANDINGS}
      groupZones={zonesFor(STANDINGS, {
        promotions: 1,
        promotionPlayoff: 0,
        demotionPlayoff: 0,
        demotions: 1,
      })}
      divisionName="Division 1"
      divisionStandings={null}
      defaultScope="group"
      meId="me"
      today="2026-02-05"
    />
  );
}
