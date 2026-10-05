import { describe, expect, it } from "vitest";
import type {
  PublicDivision,
  PublicGroup,
  PublicMatch,
} from "@/features/public-league/queries";
import type { StandingsRow } from "@/features/reporting/standings";
import {
  currentWeekCell,
  type FavoritePlayer,
  favoriteCandidates,
  favoriteGroups,
  favoriteRefusal,
  favoritesTable,
  favoritesWeek,
  formCellCovered,
  formCells,
  keepRemoved,
} from "./favorites";

const who = (userId: string) => ({ userId, name: userId, avatarUrl: null });

function match(
  id: string,
  round: number,
  a: string,
  b: string | null,
  extra: Partial<PublicMatch> = {},
): PublicMatch {
  return {
    matchId: id,
    round,
    playerA: who(a),
    playerB: b === null ? null : who(b),
    reported: false,
    pending: false,
    scoreA: null,
    scoreB: null,
    winnerId: null,
    isMotw: false,
    embargo: null,
    ...extra,
  };
}

// A reported result, `winner` null for a double loss.
function won(
  id: string,
  round: number,
  a: string,
  b: string,
  winner: string | null,
  extra: Partial<PublicMatch> = {},
): PublicMatch {
  return match(id, round, a, b, {
    reported: true,
    winnerId: winner,
    scoreA: winner === a ? 2 : 0,
    scoreB: winner === b ? 2 : 0,
    ...extra,
  });
}

function row(
  userId: string,
  rank: number,
  wins: number,
  losses: number,
  extra: Partial<StandingsRow> = {},
): StandingsRow {
  return {
    ...who(userId),
    wins,
    losses,
    points: wins * 3,
    gamesWon: wins * 2,
    gamesLost: losses * 2,
    rank,
    ...extra,
  };
}

function group(
  id: string,
  name: string,
  standings: StandingsRow[],
  matches: PublicMatch[],
): PublicGroup {
  return {
    subDivisionId: id,
    name,
    shortName: name.slice(-2),
    standings,
    zones: null,
    matches,
    withheldResults: 0,
  };
}

function division(
  tier: number,
  groups: PublicGroup[],
  divisionStandings: StandingsRow[] | null = null,
): PublicDivision {
  return {
    tier,
    name: `Division ${tier}`,
    mode: divisionStandings ? "division" : "sub_division",
    divisionStandings,
    divisionZones: null,
    divisionGroupLabels: null,
    groups,
    withheldResults: 0,
  };
}

describe("favoriteGroups / favoritesWeek", () => {
  const g1a = group(
    "g1a",
    "Division 1a",
    [],
    [
      won("m1", 1, "mira", "felix", "mira"),
      match("m2", 1, "nico", "paul"),
      match("m3", 2, "mira", "nico"),
    ],
  );
  const g2a = group(
    "g2a",
    "Division 2a",
    [],
    [match("m4", 1, "lena", "tobi"), match("m5", 2, "alex", null)],
  );
  const divisions = [division(2, [g2a]), division(1, [g1a])];

  it("keeps only matches with a favourite, in tier order", () => {
    const groups = favoriteGroups(divisions, new Set(["mira", "lena", "tobi"]));
    expect(groups.map((g) => g.name)).toEqual(["Division 1a", "Division 2a"]);
    expect(groups[0].matches.map((m) => m.matchId)).toEqual(["m1", "m3"]);
  });

  it("lists a duel of two favourites once", () => {
    const groups = favoriteGroups(divisions, new Set(["lena", "tobi"]));
    expect(groups).toHaveLength(1);
    expect(groups[0].matches.map((m) => m.matchId)).toEqual(["m4"]);
  });

  it("keeps a favourite's bye", () => {
    const week = favoritesWeek(favoriteGroups(divisions, new Set(["alex"])), 2);
    expect(week[0].matches[0].playerB).toBeNull();
  });

  it("drops groups without a favourite's match that round", () => {
    const groups = favoriteGroups(divisions, new Set(["mira", "lena"]));
    expect(favoritesWeek(groups, 2).map((g) => g.name)).toEqual([
      "Division 1a",
    ]);
    expect(favoritesWeek(groups, 7)).toEqual([]);
  });
});

describe("formCells", () => {
  it("reads wins, losses and double losses in round order", () => {
    const cells = formCells(
      [
        won("m3", 3, "kai", "sam", null),
        won("m1", 1, "sam", "vera", "sam"),
        won("m2", 2, "kai", "sam", "kai"),
      ],
      "sam",
      [],
      4,
    );
    expect(cells.map((c) => c.result)).toEqual(["W", "L", "double_loss"]);
  });

  it("counts a walkover and a drop loss as a loss", () => {
    // Both arrive as results with the opponent as winner (drop override).
    const cells = formCells(
      [won("m1", 1, "sam", "vera", "vera")],
      "sam",
      [],
      2,
    );
    expect(cells[0].result).toBe("L");
  });

  it("marks an overdue match offen and skips the running one", () => {
    const cells = formCells(
      [match("m1", 1, "sam", "vera"), match("m2", 2, "sam", "kai")],
      "sam",
      [],
      2,
    );
    expect(cells.map((c) => [c.round, c.result])).toEqual([[1, "offen"]]);
  });

  it("includes the running Spieltag once it has a result", () => {
    const cells = formCells([won("m2", 2, "sam", "kai", "sam")], "sam", [], 2);
    expect(cells.map((c) => c.round)).toEqual([2]);
  });

  it("skips byes, future rounds and embargoed results", () => {
    const cells = formCells(
      [
        match("bye", 1, "sam", null),
        won("future", 5, "sam", "kai", "sam"),
        won("held", 2, "sam", "vera", "sam", {
          embargo: { reason: "recording", access: "withheld" },
        }),
      ],
      "sam",
      [],
      3,
    );
    expect(cells).toEqual([]);
  });

  it("carries a predecessor's rounds for a replacement", () => {
    const cells = formCells(
      [
        won("m1", 1, "anton", "vera", "vera"),
        won("m2", 2, "ni2", "kai", "ni2"),
      ],
      "ni2",
      ["anton"],
      3,
    );
    expect(cells.map((c) => c.result)).toEqual(["L", "W"]);
  });

  it("treats every round as past without a running Spieltag", () => {
    const cells = formCells([match("m7", 7, "sam", "kai")], "sam", [], null);
    expect(cells.map((c) => c.result)).toEqual(["offen"]);
  });
});

describe("favoritesTable", () => {
  const g1a = group(
    "g1a",
    "Division 1a",
    [row("mira", 1, 3, 0), row("felix", 2, 2, 1)],
    [won("m1", 1, "mira", "felix", "mira")],
  );
  const g1b = group(
    "g1b",
    "Division 1b",
    [row("jonas", 1, 2, 1), row("sam", 2, 0, 3, { dropped: true })],
    [],
  );
  const g2a = group("g2a", "Division 2a", [row("lena", 1, 3, 0)], []);

  it("takes place and record from the deciding table", () => {
    const merged = [
      row("mira", 1, 3, 0),
      row("jonas", 2, 2, 1),
      row("felix", 3, 2, 1),
      row("sam", 4, 0, 3, { dropped: true }),
    ];
    const rows = favoritesTable(
      [division(1, [g1a, g1b], merged)],
      new Set(["jonas", "sam"]),
      new Map(),
      2,
    );
    expect(rows.map((r) => [r.userId, r.rank, r.groupName])).toEqual([
      ["jonas", 2, "Division 1b"],
      ["sam", 4, "Division 1b"],
    ]);
  });

  it("keeps a dropped favourite with the flag", () => {
    const rows = favoritesTable(
      [division(1, [g1b])],
      new Set(["sam"]),
      new Map(),
      2,
    );
    expect(rows[0].dropped).toBe(true);
  });

  it("skips favourites without a table row (unplaced, replaced)", () => {
    const rows = favoritesTable(
      [division(1, [g1a])],
      new Set(["mira", "nobody", "anton"]),
      new Map([["anton", "ni2"]]),
      2,
    );
    expect(rows.map((r) => r.userId)).toEqual(["mira"]);
  });

  it("sorts by tier, then place", () => {
    const rows = favoritesTable(
      [division(2, [g2a]), division(1, [g1a, g1b])],
      new Set(["lena", "felix", "jonas"]),
      new Map(),
      2,
    );
    expect(rows.map((r) => r.userId)).toEqual(["jonas", "felix", "lena"]);
  });

  it("builds the form from the group's matches", () => {
    const rows = favoritesTable(
      [division(1, [g1a])],
      new Set(["felix"]),
      new Map(),
      2,
    );
    expect(rows[0].form.map((c) => c.result)).toEqual(["L"]);
  });
});

describe("spoiler coupling of the running week", () => {
  const player = {
    form: formCells(
      [won("m1", 1, "sam", "vera", "sam"), won("m2", 2, "sam", "kai", "kai")],
      "sam",
      [],
      2,
    ),
  };
  const context = {
    currentRound: 2,
    meId: "me",
    spoilersOff: false,
    revealed: new Set<string>(),
  };

  it("finds the running week's result", () => {
    expect(currentWeekCell(player, 2)?.matchId).toBe("m2");
    expect(currentWeekCell(player, 3)).toBeNull();
    expect(currentWeekCell(player, null)).toBeNull();
  });

  it("covers only the running week", () => {
    const [past, now] = player.form;
    expect(formCellCovered(past, context)).toBe(false);
    expect(formCellCovered(now, context)).toBe(true);
  });

  it("opens with the match's reveal and with the switch", () => {
    const now = player.form[1];
    expect(
      formCellCovered(now, { ...context, revealed: new Set(["m2"]) }),
    ).toBe(false);
    expect(formCellCovered(now, { ...context, spoilersOff: true })).toBe(false);
  });

  it("is open when the viewer played the match", () => {
    expect(formCellCovered(player.form[1], { ...context, meId: "kai" })).toBe(
      false,
    );
  });

  it("keeps a Match of the Week covered with the switch off", () => {
    const motw = { ...player.form[1], isMotw: true };
    expect(formCellCovered(motw, { ...context, spoilersOff: true })).toBe(true);
  });
});

describe("favoriteCandidates", () => {
  it("lists table players once, without the viewer, by name", () => {
    const g = group(
      "g",
      "Division 1a",
      [row("mira", 1, 1, 0), row("me", 2, 0, 1), row("felix", 3, 0, 1)],
      [],
    );
    const list = favoriteCandidates(
      [division(1, [g])],
      new Map([["mira", "mira.vgc"]]),
      "me",
    );
    expect(list.map((p) => [p.userId, p.username])).toEqual([
      ["felix", null],
      ["mira", "mira.vgc"],
    ]);
  });
});

describe("keepRemoved", () => {
  const player = (userId: string, tier: number, rank: number) =>
    ({
      userId,
      name: userId,
      avatarUrl: null,
      tier,
      groupName: `Division ${tier}a`,
      rank,
      wins: 0,
      losses: 0,
      dropped: false,
      form: [],
    }) satisfies FavoritePlayer;
  const previous = {
    players: [player("mira", 1, 1), player("lena", 2, 1)],
    groups: [
      {
        subDivisionId: "g1a",
        name: "Division 1a",
        tier: 1,
        matches: [match("m1", 1, "mira", "felix")],
      },
      {
        subDivisionId: "g2a",
        name: "Division 2a",
        tier: 2,
        matches: [match("m2", 1, "lena", "tobi")],
      },
    ],
  };

  it("carries a removed player's row and matches into fresh data", () => {
    const next = {
      players: [player("lena", 2, 1), player("sam", 3, 4)],
      groups: [previous.groups[1]],
    };
    const merged = keepRemoved(next, previous, new Set(["mira"]));
    expect(merged.players.map((p) => p.userId)).toEqual([
      "mira",
      "lena",
      "sam",
    ]);
    expect(merged.groups.map((g) => g.name)).toEqual([
      "Division 1a",
      "Division 2a",
    ]);
  });

  it("changes nothing without removals", () => {
    const next = { players: [player("lena", 2, 1)], groups: [] };
    expect(keepRemoved(next, previous, new Set())).toEqual(next);
  });
});

describe("favoriteRefusal", () => {
  it("refuses anonymous viewers, yourself and unknown players", () => {
    expect(
      favoriteRefusal({ viewerId: null, playerId: "p", playerExists: true }),
    ).toMatch(/Melde dich an/);
    expect(
      favoriteRefusal({ viewerId: "p", playerId: "p", playerExists: true }),
    ).toMatch(/selbst/);
    expect(
      favoriteRefusal({ viewerId: "v", playerId: "p", playerExists: false }),
    ).toMatch(/gibt es nicht/);
    expect(
      favoriteRefusal({ viewerId: "v", playerId: "p", playerExists: true }),
    ).toBeNull();
  });
});
