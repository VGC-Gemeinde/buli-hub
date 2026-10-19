import { RelegationPlayoffsPreviewView } from "buli-hub";
import { finalTable } from "@/features/final-table/places";
import { relegationPlayoffsPreview } from "@/features/schedule/relegation-playoffs-preview";
import type { Identity } from "@/features/season/dashboard";

/* Relegation und Playoffs as staff see them on the Spielplan before
 * publishing: the weeks after the last Spieltag as three small cards, the
 * shared places still to decide ("Gleichstände an Zonengrenzen"), then every
 * pairing with its seats ("Division 1a · Platz 4") and who holds them by the
 * current table. A seat still under a tie names its candidates ("Lumi oder
 * Rocco"); a side decided by an earlier round reads "Sieger VF 2"; byes sit
 * in a dashed box. Nothing here is public.
 *
 * Built with the real pure relegationPlayoffsPreview over final tables, the
 * same two scenarios as the dev/ui gallery.
 */

const NAMES = [
  "Kaito",
  "Sirius",
  "Lumi",
  "Rocco",
  "Mareike",
  "Jonte",
  "Vivi",
  "Hendrik",
  "Ronja",
  "Ilyas",
  "Nele",
  "Bastian",
  "Theo",
  "Pia",
  "Quentin",
  "Fenja",
];
const identities = new Map<string, Identity>(
  NAMES.map((name) => [name, { userId: name, name, avatarUrl: null }]),
);
const NO_ZONES = {
  champion: 0,
  promotions: 0,
  promotionPlayoff: 0,
  demotionPlayoff: 0,
  demotions: 0,
};
function table(
  tier: number,
  position: number | null,
  names: string[],
  ranks: number[],
  counts: Partial<typeof NO_ZONES>,
) {
  return finalTable({
    tier,
    subDivisionId: position === null ? null : `${tier}-${position}`,
    groupPosition: position,
    groupLot: position === null ? null : position / 10,
    rows: names.map((userId, i) => ({
      userId,
      rank: ranks[i],
      dropped: false,
      lot: i / 10,
    })),
    counts: { ...NO_ZONES, ...counts },
  });
}
const MATCHDAYS = [
  { startsOn: "2026-11-09", endsOn: "2026-11-15" },
  { startsOn: "2026-11-16", endsOn: "2026-11-22" },
  { startsOn: "2026-11-23", endsOn: "2026-11-29" },
];

// Division 1 in two groups (two title seats and one relegation seat each, a
// three-way tie at the title boundary in 1a), Division 2 in two groups (one
// relegation seat each, a two-way tie at it in 2b).
const GROUPS = relegationPlayoffsPreview({
  tablesByTier: new Map([
    [
      1,
      [
        table(1, 0, ["Kaito", "Sirius", "Lumi", "Rocco"], [1, 2, 2, 2], {
          champion: 2,
          demotionPlayoff: 1,
        }),
        table(1, 1, ["Mareike", "Jonte", "Vivi", "Hendrik"], [1, 2, 3, 4], {
          champion: 2,
          demotionPlayoff: 1,
        }),
      ],
    ],
    [
      2,
      [
        table(2, 0, ["Ronja", "Ilyas", "Nele", "Bastian"], [1, 2, 3, 4], {
          promotionPlayoff: 1,
        }),
        table(2, 1, ["Theo", "Pia", "Quentin", "Fenja"], [1, 1, 3, 4], {
          promotionPlayoff: 1,
        }),
      ],
    ],
  ]),
  matchdays: MATCHDAYS.slice(0, 2),
});

// Division 1 by its Gesamttabelle with six playoff places: 1 and 2 get a bye.
const BYES = relegationPlayoffsPreview({
  tablesByTier: new Map([
    [
      1,
      [
        table(1, null, NAMES.slice(0, 8), [1, 2, 3, 4, 5, 6, 7, 8], {
          champion: 6,
        }),
      ],
    ],
  ]),
  matchdays: MATCHDAYS,
});

/** Group mode: two ties at zone boundaries (one goes to a tiebreaker, one is
 *  a staff decision), the relegation pairings and the semi-finals that keep
 *  the groups apart. */
export const Gruppenmodus = () => (
  <RelegationPlayoffsPreviewView preview={GROUPS} identities={identities} />
);

/** Gesamttabelle with six playoff places: three weeks, a Viertelfinale with
 *  two byes, the later rounds fed by "Sieger VF n". */
export const MitFreilosen = () => (
  <RelegationPlayoffsPreviewView preview={BYES} identities={identities} />
);

/** The seeding gives no first round that keeps the groups apart: the
 *  Playoffs section says so instead of listing matches. */
export const PlayoffsNichtTrennbar = () => (
  <RelegationPlayoffsPreviewView
    preview={{ ...GROUPS, ties: [], playoffs: "unseparable" }}
    identities={identities}
  />
);
