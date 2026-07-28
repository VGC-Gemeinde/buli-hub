import { ProfileSpielplan } from "buli-hub";
import type { ProfileScheduleRow } from "@/features/player-profile/profile";
import { AVATAR_URL, MATCHDAYS } from "./_fixtures";

/* The whole „Spielplan" section of a player profile (`/spieler/[userId]`): the
 * signature section header with its rule, the spoiler switch parked in the
 * header's meta slot, and the row list below it.
 *
 * This is the stateful half of the pair — it owns the switch and feeds
 * `spoilersOff` down to `ProfileSchedule`. `initialSpoilersOff` seeds it from
 * the same cookie the public overview's switch writes, so arriving from an
 * already-unprotected overview renders this section open; the default is
 * protected. Both cells therefore differ in the switch AND in every row the
 * switch governs.
 *
 * Composed at the profile page's real column width (`max-w-2xl` ≈ its 640px).
 * Cell names sort so the canonical protected state comes first.
 */

const EXTRA_MATCHDAY = { round: 5, startsOn: "2026-02-02", endsOn: "2026-02-08" };

const row = (
  matchday: { round: number; startsOn: string; endsOn: string },
  opponent: ProfileScheduleRow["opponent"],
  extra: Partial<ProfileScheduleRow> = {},
): ProfileScheduleRow => ({
  matchId: `sp${matchday.round}`,
  round: matchday.round,
  startsOn: matchday.startsOn,
  endsOn: matchday.endsOn,
  opponent,
  reported: false,
  scoreSelf: null,
  scoreOpponent: null,
  isMine: false,
  isMotw: false,
  ...extra,
});

/** annegret's season as another signed-in player sees it: two ordinary results
 *  that follow the switch, the permanently covered MotW row, the one match the
 *  viewer played themselves (never a spoiler), and a bye. Week ranges come from
 *  the shared matchday calendar, so the Spieltage really are consecutive. */
const ROWS: ProfileScheduleRow[] = [
  row(MATCHDAYS[0], { userId: "3", name: "Blaubeerkuchen", avatarUrl: AVATAR_URL }, {
    reported: true,
    scoreSelf: 2,
    scoreOpponent: 0,
  }),
  row(MATCHDAYS[1], { userId: "e", name: "Kilowattrel", avatarUrl: null }, {
    reported: true,
    scoreSelf: 0,
    scoreOpponent: 2,
  }),
  row(
    MATCHDAYS[2],
    { userId: "4", name: "Yannick mit sehr langem Namen", avatarUrl: null },
    { reported: true, scoreSelf: 2, scoreOpponent: 1, isMotw: true },
  ),
  row(MATCHDAYS[3], { userId: "me", name: "Testerino", avatarUrl: AVATAR_URL }, {
    reported: true,
    scoreSelf: 1,
    scoreOpponent: 2,
    isMine: true,
  }),
  row(EXTRA_MATCHDAY, null),
];

/** Arriving protected (the default): the switch shows „Spoiler-Schutz" on and
 *  Spieltag 1, 2 and 3 all sit behind pills — only the viewer's own Spieltag 4
 *  score is readable. */
export function MitSpoilerSchutz() {
  return (
    <div className="mx-auto max-w-2xl">
      <ProfileSpielplan rows={ROWS} initialSpoilersOff={false} />
    </div>
  );
}

/** Arriving with protection already off: the switch renders in its off state and
 *  both ordinary results are simply there — while the Match of the Week keeps
 *  its orange cover, because that exemption is not the switch's to give away. */
export function OhneSpoilerSchutz() {
  return (
    <div className="mx-auto max-w-2xl">
      <ProfileSpielplan rows={ROWS} initialSpoilersOff={true} />
    </div>
  );
}
