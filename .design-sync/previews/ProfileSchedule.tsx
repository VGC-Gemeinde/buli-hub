import { ProfileSchedule } from "buli-hub";
import type { ProfileScheduleRow } from "@/features/player-profile/profile";
import type { PlayerMatch } from "@/features/season/dashboard";
import { AVATAR_URL, PLAYER_MATCHES } from "./_fixtures";

/* The bare row list of a player profile's Spielplan — one row per Spieltag,
 * driven entirely by the `spoilersOff` prop. (`ProfileSpielplan` is the
 * stateful section that wraps this list with the header and the switch.)
 *
 * Row anatomy: fixed `w-[92px]` Spieltag + week range, opponent avatar + name
 * (links to their profile), then the fixed `w-12` score slot — so pill, score
 * and „offen" swap without a pixel of horizontal shift. The whole row is a
 * stretched link to the match; byes are not clickable.
 *
 * Spoiler rules exercised by the row set (design/SPOILER-SCHUTZ.md §2):
 *   ordinary reported row  follows the switch
 *   MotW row               permanently covered, orange pill, ignores the switch
 *   `isMine` row           always open — your own result is never a spoiler
 *   unreported row         „offen"
 *   bye                    „spielfrei"
 *
 * Not renderable statically: the per-row tap-to-reveal (component `useState`).
 *
 * Cell names are ordered so the canonical protected list sorts first — the card
 * enumerates exports alphabetically.
 */

const row = (
  match: PlayerMatch,
  extra: Partial<ProfileScheduleRow>,
): ProfileScheduleRow => ({
  matchId: match.matchId,
  round: match.round,
  startsOn: match.startsOn,
  endsOn: match.endsOn,
  opponent: match.opponent,
  reported: false,
  scoreSelf: null,
  scoreOpponent: null,
  isMine: false,
  isMotw: false,
  ...extra,
});

/** Testerino's half-season: every row state the list can produce, in Spieltag
 *  order (the bye genuinely sits mid-season). */
const ROWS: ProfileScheduleRow[] = [
  row(PLAYER_MATCHES[0], { reported: true, scoreSelf: 2, scoreOpponent: 1 }),
  row(PLAYER_MATCHES[1], {
    reported: true,
    scoreSelf: 0,
    scoreOpponent: 2,
    isMotw: true,
  }),
  row(PLAYER_MATCHES[2], {
    reported: true,
    scoreSelf: 2,
    scoreOpponent: 0,
    isMine: true,
  }),
  row(PLAYER_MATCHES[3], {}),
  row(
    {
      matchId: "m5",
      round: 5,
      startsOn: "2026-02-02",
      endsOn: "2026-02-08",
      opponent: { userId: "h", name: "Blaubeerkuchen", avatarUrl: AVATAR_URL },
    },
    { reported: true, scoreSelf: 1, scoreOpponent: 2 },
  ),
  row(
    {
      matchId: "m6",
      round: 6,
      startsOn: "2026-02-09",
      endsOn: "2026-02-15",
      opponent: { userId: "d", name: "Grafaiai", avatarUrl: null },
    },
    {},
  ),
];

/** Spoiler protection on (the default): Spieltag 1 and 5 show the neutral
 *  placeholder pill, the MotW row its orange pill, Spieltag 3 stays open
 *  because the viewer played it themselves. */
export function MitSpoilerSchutz() {
  return (
    <div className="mx-auto max-w-2xl">
      <ProfileSchedule rows={ROWS} spoilersOff={false} />
    </div>
  );
}

/** Protection switched off: the ordinary scores are simply there — and the MotW
 *  row is the one that stays covered, which is the point of the exemption. */
export function OhneSpoilerSchutz() {
  return (
    <div className="mx-auto max-w-2xl">
      <ProfileSchedule rows={ROWS} spoilersOff={true} />
    </div>
  );
}

/** No pairings yet (profile opened before the Spielplan is generated): one
 *  centred muted line inside a bordered box, not an empty container. */
export function OhneSpielplan() {
  return (
    <div className="mx-auto max-w-2xl">
      <ProfileSchedule rows={[]} spoilersOff={false} />
    </div>
  );
}
