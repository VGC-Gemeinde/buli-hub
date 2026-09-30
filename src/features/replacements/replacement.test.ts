import { describe, expect, it } from "vitest";
import { effectiveResult } from "../drops/drops";
import {
  computeStandings,
  divisionStandings,
  type ResultForStandings,
} from "../reporting/standings";
import {
  attributeReplacements,
  effectiveEntryRound,
  entryRoundChoices,
  markReplacements,
  missedByEntryRound,
  missedMatches,
  offerBlock,
  predecessorsOf,
  replacedByMap,
  replacedLine,
  replacementLine,
  replacementNotes,
  slotHolder,
  standingsRoster,
} from "./replacement";

const matchdays = [
  { round: 1, startsOn: "2026-09-02", endsOn: "2026-09-13" },
  { round: 2, startsOn: "2026-09-14", endsOn: "2026-09-20" },
  { round: 3, startsOn: "2026-09-21", endsOn: "2026-10-04" },
  // A gap before the last matchday, so "between matchdays" exists.
  { round: 4, startsOn: "2026-10-12", endsOn: "2026-10-18" },
];

function result(
  matchId: string,
  playerAId: string,
  playerBId: string | null,
  winnerId: string | null,
  outcome: ResultForStandings["outcome"] = winnerId ? "normal" : null,
): ResultForStandings {
  return {
    matchId,
    playerAId,
    playerBId,
    outcome,
    winnerId,
    confirmedAt: null,
    // A clean 2:0 for whoever won; nothing for an open match.
    games: winnerId && outcome === "normal" ? [{ winnerId }, { winnerId }] : [],
  };
}

const member = (userId: string) => ({ userId, name: userId, avatarUrl: null });

describe("slotHolder / predecessorsOf", () => {
  const replacedBy = new Map([
    ["x", "r"],
    ["r", "s"],
  ]);

  it("follows the chain to whoever holds the slot now", () => {
    expect(slotHolder("x", replacedBy)).toBe("s");
    expect(slotHolder("r", replacedBy)).toBe("s");
    expect(slotHolder("s", replacedBy)).toBe("s");
    expect(slotHolder("a", replacedBy)).toBe("a");
  });

  it("lists the predecessors nearest first", () => {
    expect(predecessorsOf("s", replacedBy)).toEqual(["r", "x"]);
    expect(predecessorsOf("r", replacedBy)).toEqual(["x"]);
    expect(predecessorsOf("a", replacedBy)).toEqual([]);
  });

  it("stops on a malformed cycle instead of hanging", () => {
    const cycle = new Map([
      ["x", "r"],
      ["r", "x"],
    ]);
    expect(["x", "r"]).toContain(slotHolder("x", cycle));
    expect(predecessorsOf("x", cycle).length).toBeLessThanOrEqual(2);
  });

  it("builds the map from accepted replacements", () => {
    expect(
      replacedByMap([
        { replacedUserId: "x", replacementUserId: "r", entryRound: 2 },
      ]),
    ).toEqual(new Map([["x", "r"]]));
  });
});

describe("standings with a replacement", () => {
  // Group a, b, c and the slot of x. x is dropped after not showing up in
  // round 1; r takes the slot from round 2 on (the matches from round 2 on
  // were moved onto r at acceptance, round 1 stays on x).
  const dropped = new Set(["x"]);
  const replacedBy = new Map([["x", "r"]]);
  const members = ["a", "b", "c", "x", "r"].map(member);
  const stored: ResultForStandings[] = [
    result("m1", "x", "a", null), // round 1, never played
    result("m2", "b", "c", "b"),
    result("m3", "r", "b", "r"), // round 2, r's first match
    result("m4", "a", "c", "a"),
    result("m5", "r", "c", null), // round 3, open
    result("m6", "a", "b", "b"),
  ];
  const input = attributeReplacements(
    stored.map((r) => effectiveResult(r, dropped)),
    replacedBy,
  );
  const table = computeStandings({
    roster: standingsRoster(members, replacedBy),
    results: input,
  });
  const row = (id: string) => table.find((r) => r.userId === id);

  it("leaves the replaced player out of the table", () => {
    expect(row("x")).toBeUndefined();
    expect(table).toHaveLength(4);
  });

  it("gives the replacement the slot's earlier match as a 0:2 loss", () => {
    expect(row("r")).toMatchObject({
      wins: 1,
      losses: 1,
      gamesWon: 2,
      gamesLost: 2,
    });
  });

  it("credits the opponent of the earlier match exactly once", () => {
    expect(row("a")).toMatchObject({ wins: 2, losses: 1 });
  });

  it("adds up: every match is one win and one loss", () => {
    const wins = table.reduce((sum, r) => sum + r.wins, 0);
    const losses = table.reduce((sum, r) => sum + r.losses, 0);
    expect(wins).toBe(losses);
    expect(wins).toBe(5);
  });

  it("keeps the match id on attributed rows", () => {
    expect(input.map((r) => r.matchId)).toEqual(stored.map((r) => r.matchId));
  });

  it("changes nothing without replacements", () => {
    const plain = stored.map((r) => effectiveResult(r, dropped));
    expect(attributeReplacements(plain, new Map())).toEqual(plain);
    expect(standingsRoster(members, new Map())).toHaveLength(5);
  });

  it("counts the earlier match as lost head-to-head", () => {
    // a and r end level on everything but their meeting, which is the drop
    // free win of round 1: a is ahead.
    const results = attributeReplacements(
      [
        result("h1", "x", "a", null), // round 1, x dropped
        result("h2", "r", "b", "r"),
        result("h3", "a", "b", "b"),
        result("h4", "a", "c", "a"),
        result("h5", "r", "c", "r"),
        result("h6", "b", "c", "c"),
      ].map((r) => effectiveResult(r, dropped)),
      replacedBy,
    );
    const ranked = computeStandings({
      roster: standingsRoster(members, replacedBy),
      results,
    });
    const a = ranked.find((r) => r.userId === "a");
    const r = ranked.find((r) => r.userId === "r");
    expect(a).toMatchObject({ wins: 2, gamesWon: 4, gamesLost: 2 });
    expect(r).toMatchObject({ wins: 2, gamesWon: 4, gamesLost: 2 });
    expect(a?.rank).toBeLessThan(r?.rank ?? 0);
  });

  it("keeps the division table when groups have equal slot counts", () => {
    const other = {
      roster: ["d", "e", "f", "g"].map(member),
      results: [] as ResultForStandings[],
    };
    const own = {
      roster: standingsRoster(members, replacedBy),
      results: input,
    };
    expect(divisionStandings([own, other])).toHaveLength(8);
  });
});

describe("entryRoundChoices", () => {
  it("offers the running and the next matchday during a matchday", () => {
    expect(
      entryRoundChoices(matchdays, "2026-09-19").map((c) => [
        c.round,
        c.running,
      ]),
    ).toEqual([
      [2, true],
      [3, false],
    ]);
  });

  it("offers only the next matchday between two matchdays", () => {
    expect(
      entryRoundChoices(matchdays, "2026-10-07").map((c) => c.round),
    ).toEqual([4]);
  });

  it("offers the first matchday before the season starts", () => {
    expect(
      entryRoundChoices(matchdays, "2026-08-30").map((c) => c.round),
    ).toEqual([1]);
  });

  it("offers only the running matchday during the last one", () => {
    expect(
      entryRoundChoices(matchdays, "2026-10-15").map((c) => c.round),
    ).toEqual([4]);
  });

  it("offers nothing once the season is over", () => {
    expect(entryRoundChoices(matchdays, "2026-10-19")).toEqual([]);
  });
});

describe("effectiveEntryRound", () => {
  it("keeps staff's choice while that matchday is still on", () => {
    expect(effectiveEntryRound(2, matchdays, "2026-09-20")).toBe(2);
    expect(effectiveEntryRound(3, matchdays, "2026-09-15")).toBe(3);
  });

  it("moves to the running matchday once the chosen one is over", () => {
    expect(effectiveEntryRound(2, matchdays, "2026-09-22")).toBe(3);
  });

  it("moves to the next matchday when accepted between two", () => {
    expect(effectiveEntryRound(3, matchdays, "2026-10-07")).toBe(4);
  });

  it("is null once the season has no matchday left", () => {
    expect(effectiveEntryRound(4, matchdays, "2026-10-19")).toBeNull();
  });
});

describe("offerBlock", () => {
  const ok = {
    replacedDropped: true,
    replacedHasGroup: true,
    existing: "none" as const,
    candidateExists: true,
    candidatePlaced: false,
    candidateHasOffer: false,
    entryRoundOffered: true,
  };

  it("allows a valid offer", () => {
    expect(offerBlock(ok)).toBeNull();
  });

  it.each([
    [{ replacedHasGroup: false }, "nicht platziert"],
    [{ replacedDropped: false }, "Nur gedroppte"],
    [{ existing: "accepted" as const }, "bereits ersetzt"],
    [{ existing: "pending" as const }, "bereits ein Angebot"],
    [{ candidateExists: false }, "noch nie"],
    [{ candidatePlaced: true }, "bereits mit"],
    [{ candidateHasOffer: true }, "anderen Platz"],
    [{ entryRoundOffered: false }, "Spieltag"],
  ])("refuses %o", (patch, message) => {
    expect(offerBlock({ ...ok, ...patch })).toContain(message);
  });
});

describe("lines", () => {
  it("names both sides of a replacement", () => {
    expect(replacementLine({ replacedName: "Anton", entryRound: 2 })).toBe(
      "Ersatz für Anton ab Spieltag 2",
    );
    expect(replacedLine({ replacementName: "Ni2", entryRound: 2 })).toBe(
      "Ersetzt durch Ni2 ab Spieltag 2",
    );
  });
});

describe("missedMatches", () => {
  const slot = [
    { round: 1, playerAId: "x", playerBId: "a" },
    { round: 2, playerAId: "x", playerBId: null }, // bye
    { round: 3, playerAId: "b", playerBId: "x" },
    { round: 4, playerAId: "x", playerBId: "c" },
    { round: 1, playerAId: "b", playerBId: "c" }, // someone else's
  ];

  it("counts the slot's matches before the entry round, byes excluded", () => {
    expect(missedMatches(slot, "x", 4)).toBe(2);
    expect(missedMatches(slot, "x", 1)).toBe(0);
    expect(missedMatches(slot, "x", 3)).toBe(1);
  });

  it("answers per offered entry round", () => {
    expect(missedByEntryRound(slot, "x", [3, 4])).toEqual({ 3: 1, 4: 2 });
  });
});

describe("row tags", () => {
  const replacements = [
    {
      replaced: { name: "Anton" },
      replacement: { userId: "r" },
      entryRound: 2,
      acceptedAt: new Date("2026-09-14T22:11:43Z"),
    },
    {
      replaced: { name: "Offen" },
      replacement: { userId: "p" },
      entryRound: 3,
      acceptedAt: null,
    },
  ];

  it("tags accepted replacements only", () => {
    const notes = replacementNotes(replacements);
    expect(notes).toEqual(new Map([["r", "Ersatz für Anton ab Spieltag 2"]]));
    const rows = markReplacements(
      [{ userId: "r" }, { userId: "p" }, { userId: "a" }],
      notes,
    );
    expect(rows.map((row) => row.replacement)).toEqual([
      "Ersatz für Anton ab Spieltag 2",
      undefined,
      undefined,
    ]);
  });
});
