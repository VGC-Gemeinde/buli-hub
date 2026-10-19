import { FullSchedule } from "buli-hub";
import type {
  PublicMatch,
  PublicOverview,
} from "@/features/public-league/queries";
import { AVATAR_URL } from "./_fixtures";

/* The complete Spielplan (/spielplan): every Spieltag with every pairing of
 * the selected division, groups side by side, in the overview's anatomy.
 * Spieltag 2 runs ("Läuft"); round 1 is reported, round 3 still open. Foreign
 * results are covered by default, the MotW keeps its badge. Wide by nature:
 * the page is max-w-[1040px]. */

const p = (userId: string, name: string, avatar = false) => ({
  userId,
  name,
  avatarUrl: avatar ? AVATAR_URL : null,
});

const MIRA = p("mira", "Mira Immergrün", true);
const KARL = p("karl", "Karl Kraut");
const ME = p("me", "Testerino", true);
const NICO = p("nico", "Blaubeerkuchen");
const GRETA = p("greta", "annegret", true);
const JONAS = p("jonas", "Jonas Sturm");
const BEN = p("ben", "Schnabelbär");
const OLE = p("ole", "Ole Wetter");

function m(
  matchId: string,
  round: number,
  a: ReturnType<typeof p>,
  b: ReturnType<typeof p> | null,
  score: [number, number] | null = null,
  extra: Partial<PublicMatch> = {},
): PublicMatch {
  return {
    matchId,
    round,
    playerA: a,
    playerB: b,
    reported: score !== null,
    pending: false,
    scoreA: score ? score[0] : null,
    scoreB: score ? score[1] : null,
    winnerId: score
      ? score[0] > score[1]
        ? a.userId
        : (b?.userId ?? null)
      : null,
    isMotw: false,
    embargo: null,
    ...extra,
  };
}

const OVERVIEW: PublicOverview = {
  seasonName: "Saison 9",
  currentRound: 2,
  totalRounds: 3,
  motw: null,
  matchdays: [
    { round: 1, startsOn: "2026-09-07", endsOn: "2026-09-13" },
    { round: 2, startsOn: "2026-09-14", endsOn: "2026-09-20" },
    { round: 3, startsOn: "2026-09-21", endsOn: "2026-09-27" },
  ],
  divisions: [
    {
      tier: 1,
      name: "Division 1",
      mode: "sub_division",
      divisionStandings: null,
      divisionZones: null,
      divisionGroupLabels: null,
      withheldResults: 0,
      groups: [
        {
          subDivisionId: "g1a",
          name: "Division 1a",
          shortName: "1a",
          withheldResults: 0,
          standings: [],
          zones: null,
          matches: [
            m("a1", 1, MIRA, KARL, [2, 1]),
            m("a2", 1, ME, NICO, [2, 0]),
            m("a3", 2, MIRA, ME, [1, 2]),
            m("a4", 2, KARL, NICO, [2, 1]),
            m("a5", 3, MIRA, NICO),
            m("a6", 3, KARL, ME),
          ],
        },
        {
          subDivisionId: "g1b",
          name: "Division 1b",
          shortName: "1b",
          withheldResults: 0,
          standings: [],
          zones: null,
          matches: [
            m("b1", 1, GRETA, JONAS, [2, 0]),
            m("b2", 1, BEN, OLE, [0, 2]),
            m("b3", 2, GRETA, OLE, [2, 1], { isMotw: true }),
            m("b4", 2, JONAS, BEN),
            m("b5", 3, GRETA, BEN),
            m("b6", 3, JONAS, null),
          ],
        },
      ],
    },
    {
      tier: 2,
      name: "Division 2",
      mode: "sub_division",
      divisionStandings: null,
      divisionZones: null,
      divisionGroupLabels: null,
      withheldResults: 0,
      groups: [],
    },
  ],
};

export function AlleSpieltage() {
  return (
    <FullSchedule
      overview={OVERVIEW}
      meId="me"
      initialSpoilersOff={false}
      hiddenPreview={false}
      favoriteIds={new Set(["greta"])}
    />
  );
}

export function InternNochNichtVeroeffentlicht() {
  return (
    <FullSchedule
      overview={{
        ...OVERVIEW,
        currentRound: null,
        divisions: OVERVIEW.divisions.map((d) => ({
          ...d,
          groups: d.groups.map((g) => ({
            ...g,
            matches: g.matches.map((match) => ({
              ...match,
              reported: false,
              scoreA: null,
              scoreB: null,
              winnerId: null,
              isMotw: false,
            })),
          })),
        })),
      }}
      meId=""
      initialSpoilersOff={false}
      hiddenPreview
    />
  );
}

export function StaffAnsichtSpoilerAus() {
  return (
    <div className="mx-auto w-full max-w-[1040px] px-6 py-8">
      <FullSchedule
        overview={OVERVIEW}
        meId=""
        initialSpoilersOff
        hiddenPreview={false}
        embedded
      />
    </div>
  );
}
