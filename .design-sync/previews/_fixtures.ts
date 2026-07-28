/* Shared preview fixtures — the realistic VGC Bundesliga mock data the
 * previews compose with. Ported from the repo's own `dev/ui` gallery
 * (`src/features/dev/components/gallery.tsx`), which is the authored source of
 * truth for how these components are exercised.
 *
 * Not a preview itself: the converter only compiles `<ComponentName>.tsx`
 * entries, and the leading underscore keeps this out of that namespace.
 *
 * Type-only imports (erased at build time) are safe to take from feature
 * modules — a VALUE import from anything that reaches a "use server" module
 * would drag the db into the bundle. See .design-sync/NOTES.md.
 */
import type { MotwBlockData } from "@/features/motw/motw";
import type { PublicMatch, PublicOverview } from "@/features/public-league/queries";
import type { StandingsRow } from "@/features/reporting/standings";
import type { PlayerMatch } from "@/features/season/dashboard";

export const AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/1.png";

/** German community names, matching the gallery — never foo/bar. */
export const ROSTER = [
  { id: "1", name: "Testerino", avatarUrl: AVATAR_URL },
  { id: "2", name: "annegret" },
  { id: "3", name: "Blaubeerkuchen" },
  { id: "4", name: "Yannick mit sehr langem Namen" },
];

/** One group's table. `c` is dropped → exercises the „Drop" tag; b/c share
 *  rank 3 → exercises the tie rendering (no rank 4). */
export const STANDINGS: StandingsRow[] = [
  { userId: "me", name: "Testerino", avatarUrl: AVATAR_URL, wins: 1, losses: 0, points: 3, gamesWon: 2, gamesLost: 0, rank: 1 },
  { userId: "a", name: "Falinks", avatarUrl: null, wins: 0, losses: 1, points: 0, gamesWon: 0, gamesLost: 2, rank: 2 },
  { userId: "b", name: "Wooloo", avatarUrl: AVATAR_URL, wins: 0, losses: 0, points: 0, gamesWon: 0, gamesLost: 0, rank: 3 },
  { userId: "c", name: "Pawmi", avatarUrl: null, wins: 0, losses: 0, points: 0, gamesWon: 0, gamesLost: 0, rank: 3, dropped: true },
];

/** Groups 1a + 1b merged — the „Gesamttabelle" view of the division switcher. */
export const DIVISION_STANDINGS: StandingsRow[] = [
  { userId: "d", name: "Grafaiai", avatarUrl: null, wins: 1, losses: 0, points: 3, gamesWon: 2, gamesLost: 1, rank: 1 },
  { userId: "me", name: "Testerino", avatarUrl: AVATAR_URL, wins: 1, losses: 0, points: 3, gamesWon: 2, gamesLost: 0, rank: 1 },
  { userId: "e", name: "Kilowattrel", avatarUrl: null, wins: 1, losses: 0, points: 3, gamesWon: 2, gamesLost: 0, rank: 1 },
  { userId: "a", name: "Falinks", avatarUrl: null, wins: 0, losses: 1, points: 0, gamesWon: 0, gamesLost: 2, rank: 4 },
  { userId: "f", name: "Maushold", avatarUrl: null, wins: 0, losses: 1, points: 0, gamesWon: 0, gamesLost: 2, rank: 4 },
  { userId: "b", name: "Wooloo", avatarUrl: AVATAR_URL, wins: 0, losses: 0, points: 0, gamesWon: 0, gamesLost: 0, rank: 6 },
  { userId: "c", name: "Pawmi", avatarUrl: null, wins: 0, losses: 0, points: 0, gamesWon: 0, gamesLost: 0, rank: 6 },
  { userId: "g", name: "Tinkatink", avatarUrl: null, wins: 0, losses: 0, points: 0, gamesWon: 0, gamesLost: 0, rank: 6 },
];

export const asIdentity = (row: StandingsRow) => ({
  userId: row.userId,
  name: row.name,
  avatarUrl: row.avatarUrl,
});

export const MATCHDAYS = [
  { round: 1, startsOn: "2026-01-05", endsOn: "2026-01-11" },
  { round: 2, startsOn: "2026-01-12", endsOn: "2026-01-18" },
  { round: 3, startsOn: "2026-01-19", endsOn: "2026-01-25" },
  { round: 4, startsOn: "2026-01-26", endsOn: "2026-02-01" },
];

export const MOTW_MATCH: PublicMatch = {
  matchId: "motw1",
  round: 2,
  playerA: asIdentity(STANDINGS[0]),
  playerB: asIdentity(STANDINGS[1]),
  reported: true,
  pending: false,
  scoreA: 2,
  scoreB: 1,
  winnerId: STANDINGS[0].userId,
  isMotw: true,
};

/** Note the shape: MotwBlockData WRAPS a PublicMatch, it does not flatten it. */
export const MOTW_BLOCK: MotwBlockData = {
  match: MOTW_MATCH,
  groupName: "Division 1a",
  youtubeUrl: null,
  rankA: 1,
  rankB: 2,
};

/** A player's own schedule — used by the season/profile dashboards. */
export const PLAYER_MATCHES: PlayerMatch[] = [
  { matchId: "m1", round: 1, startsOn: "2026-01-05", endsOn: "2026-01-11", opponent: { userId: "a", name: "Falinks", avatarUrl: null } },
  { matchId: "m2", round: 2, startsOn: "2026-01-12", endsOn: "2026-01-18", opponent: { userId: "b", name: "Wooloo", avatarUrl: AVATAR_URL } },
  { matchId: "m3", round: 3, startsOn: "2026-01-19", endsOn: "2026-01-25", opponent: { userId: "c", name: "Pawmi", avatarUrl: null } },
  { matchId: "m4", round: 4, startsOn: "2026-01-26", endsOn: "2026-02-01", opponent: null },
];

/** Between rounds / no pick yet: the prominent MotW block is absent entirely.
 *  A genuinely different layout, not just a toggled control. */
export const overviewWithoutMotw = (): PublicOverview => ({
  ...PUBLIC_OVERVIEW,
  motw: null,
});

/** The public league overview: one division, two groups, matchday 2 in flight. */
export const PUBLIC_OVERVIEW: PublicOverview = {
  seasonName: "Saison 1",
  currentRound: 2,
  totalRounds: 4,
  matchdays: MATCHDAYS,
  motw: MOTW_BLOCK,
  divisions: [
    {
      tier: 1,
      name: "Division 1",
      mode: "division",
      divisionStandings: DIVISION_STANDINGS,
      divisionZones: null,
      divisionGroupLabels: new Map(
        DIVISION_STANDINGS.map((r, i) => [r.userId, i % 2 === 0 ? "1a" : "1b"]),
      ),
      groups: [
        {
          subDivisionId: "1a",
          name: "Division 1a",
          shortName: "1a",
          standings: STANDINGS,
          zones: null,
          matches: [
            MOTW_MATCH,
            {
              matchId: "pm2",
              round: 2,
              playerA: asIdentity(STANDINGS[2]),
              playerB: asIdentity(STANDINGS[3]),
              reported: false,
              pending: false,
              scoreA: null,
              scoreB: null,
              winnerId: null,
              isMotw: false,
            },
            {
              matchId: "pm3",
              round: 2,
              playerA: asIdentity(STANDINGS[0]),
              playerB: null, // bye („spielfrei")
              reported: false,
              pending: false,
              scoreA: null,
              scoreB: null,
              winnerId: null,
              isMotw: false,
            },
          ],
        },
      ],
    },
  ],
};
