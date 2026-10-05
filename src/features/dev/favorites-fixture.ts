// The Favoriten specimen of /dev/ui (docs/plans/favorites.md): a small season
// in the public overview's shape, run through the real pure functions, so the
// gallery shows exactly what the page computes. Spieltag 3 runs and covers
// every row state: a covered result, a duel of two favourites, an own match
// (always open), a recording hold, the Match of the Week before its VOD, a
// bye, a drop, an overdue result and a future week.

import {
  favoriteCandidates,
  favoriteGroups,
  favoritesTable,
} from "@/features/favorites/favorites";
import type { FavoritesPageData } from "@/features/favorites/queries";
import type {
  PublicDivision,
  PublicMatch,
} from "@/features/public-league/queries";
import type { StandingsRow } from "@/features/reporting/standings";

const AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/1.png";

const who = (userId: string, avatar = false) => ({
  userId,
  name: userId[0].toUpperCase() + userId.slice(1),
  avatarUrl: avatar ? AVATAR_URL : null,
});

function m(
  id: string,
  round: number,
  a: string,
  b: string | null,
  // Winner of a reported result; undefined = not reported.
  winner?: string | null,
  extra: Partial<PublicMatch> = {},
): PublicMatch {
  const reported = winner !== undefined;
  return {
    matchId: id,
    round,
    playerA: who(a, a === "mira" || a === "lena"),
    playerB: b === null ? null : who(b),
    reported,
    pending: false,
    scoreA: reported ? (winner === a ? 2 : 1) : null,
    scoreB: reported ? (winner === b ? 2 : 1) : null,
    winnerId: reported ? (winner ?? null) : null,
    isMotw: false,
    embargo: null,
    ...extra,
  };
}

// A result the public may not see yet: the row carries no score.
const withheld = (
  reason: "recording" | "motw",
  isMotw = false,
): Partial<PublicMatch> => ({
  embargo: { reason, access: "withheld" },
  scoreA: null,
  scoreB: null,
  winnerId: null,
  isMotw,
});

function row(
  userId: string,
  rank: number,
  wins: number,
  losses: number,
  dropped = false,
): StandingsRow {
  return {
    ...who(userId, userId === "mira" || userId === "lena"),
    wins,
    losses,
    points: wins * 3,
    gamesWon: wins * 2,
    gamesLost: losses * 2,
    rank,
    dropped,
  };
}

const DIVISIONS: PublicDivision[] = [
  {
    tier: 1,
    name: "Division 1",
    mode: "sub_division",
    divisionStandings: null,
    divisionZones: null,
    divisionGroupLabels: null,
    withheldResults: 2,
    groups: [
      {
        subDivisionId: "fav-1a",
        name: "Division 1a",
        shortName: "1a",
        zones: null,
        withheldResults: 1,
        standings: [
          row("mira", 1, 2, 0),
          row("felix", 2, 1, 1),
          row("me", 3, 1, 1),
          row("nico", 4, 0, 2),
        ],
        matches: [
          m("f1", 1, "mira", "felix", "mira"),
          m("f2", 1, "me", "nico", "me"),
          // Mira against the viewer: their own match, never covered.
          m("f3", 2, "mira", "me", "mira"),
          m("f4", 2, "felix", "nico", "felix"),
          m("f5", 3, "mira", "nico", null, withheld("recording")),
          m("f6", 3, "felix", "me"),
          m("f7", 4, "mira", "felix"),
        ],
      },
      {
        subDivisionId: "fav-1b",
        name: "Division 1b",
        shortName: "1b",
        zones: null,
        withheldResults: 1,
        standings: [
          row("greta", 1, 3, 0),
          row("jonas", 2, 1, 1),
          row("ben", 3, 1, 1),
          row("sam", 4, 0, 3, true),
        ],
        matches: [
          m("f8", 1, "jonas", "greta", "greta"),
          m("f9", 1, "sam", "ben", "ben"),
          m("f10", 2, "jonas", "sam", "jonas"),
          m("f11", 3, "jonas", "ben", null, withheld("motw", true)),
          // Sam is dropped: the match counts 2:0 for Greta.
          m("f12", 3, "sam", "greta", "greta", { scoreA: 0, scoreB: 2 }),
          m("f13", 4, "jonas", "ben"),
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
    groups: [
      {
        subDivisionId: "fav-2a",
        name: "Division 2a",
        shortName: "2a",
        zones: null,
        withheldResults: 0,
        standings: [
          row("lena", 1, 3, 0),
          row("tobi", 2, 1, 1),
          row("ida", 3, 0, 1),
          row("finn", 4, 0, 2),
        ],
        matches: [
          m("f14", 1, "lena", "ida", "lena"),
          m("f15", 1, "tobi", "finn", "tobi"),
          m("f16", 2, "lena", "finn", "lena"),
          // Overdue: the form shows it as open.
          m("f17", 2, "tobi", "ida"),
          // A duel of two favourites, reported: one row, both stars.
          m("f18", 3, "lena", "tobi", "lena"),
          m("f19", 4, "lena", "finn"),
        ],
      },
      {
        subDivisionId: "fav-2b",
        name: "Division 2b",
        shortName: "2b",
        zones: null,
        withheldResults: 0,
        standings: [row("alex", 1, 2, 0), row("pia", 2, 0, 1)],
        matches: [
          m("f20", 1, "alex", "pia", "alex"),
          m("f21", 2, "alex", "rico", "alex"),
          m("f22", 3, "alex", null),
        ],
      },
    ],
  },
];

const IDS = new Set(["mira", "jonas", "sam", "lena", "tobi", "alex"]);
const CURRENT_ROUND = 3;

export const FAVORITES_GALLERY: FavoritesPageData = {
  seasonName: "Saison 1",
  currentRound: CURRENT_ROUND,
  totalRounds: 4,
  matchdays: [
    { round: 1, startsOn: "2026-01-05", endsOn: "2026-01-11" },
    { round: 2, startsOn: "2026-01-12", endsOn: "2026-01-18" },
    { round: 3, startsOn: "2026-01-19", endsOn: "2026-01-25" },
    { round: 4, startsOn: "2026-01-26", endsOn: "2026-02-01" },
  ],
  groups: favoriteGroups(DIVISIONS, IDS),
  players: favoritesTable(DIVISIONS, IDS, new Map(), CURRENT_ROUND),
  candidates: favoriteCandidates(
    DIVISIONS,
    new Map([["mira", "mira.vgc"]]),
    "me",
  ),
};

export const FAVORITES_GALLERY_EMPTY: FavoritesPageData = {
  ...FAVORITES_GALLERY,
  groups: [],
  players: [],
};
