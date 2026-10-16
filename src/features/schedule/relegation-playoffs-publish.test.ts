import { describe, expect, it } from "vitest";
import { finalTable } from "@/features/final-table/places";
import {
  publishBlockers,
  tiebreakersToCreate,
  tieDecisions,
} from "./relegation-playoffs-publish";

const READY = {
  scheduleCreated: true,
  lastSpieltagOver: true,
  unreported: 0,
  openDisputes: 0,
  pendingFreeWins: 0,
  heldRegular: 0,
  motwWithoutVod: 0,
  openReplacementOffers: 0,
};

const NONE = {
  champion: 0,
  promotions: 0,
  promotionPlayoff: 0,
  demotionPlayoff: 0,
  demotions: 0,
};

describe("publishBlockers", () => {
  it("lets a settled season publish", () => {
    expect(publishBlockers(READY)).toEqual([]);
  });

  it("names every open point with a link, in checklist order", () => {
    const blockers = publishBlockers({
      scheduleCreated: false,
      lastSpieltagOver: false,
      unreported: 2,
      openDisputes: 1,
      pendingFreeWins: 3,
      heldRegular: 1,
      motwWithoutVod: 1,
      openReplacementOffers: 2,
    });
    expect(blockers.map((b) => [b.kind, b.label])).toEqual([
      ["schedule", "Der Spielplan für Relegation und Playoffs fehlt"],
      ["last_spieltag", "Der letzte Spieltag läuft noch"],
      ["unreported", "2 Matches haben noch kein Ergebnis"],
      ["disputes", "1 Ergebnis ist angefochten"],
      ["free_wins", "3 Freewins warten auf Bestätigung"],
      ["holds", "1 Aufnahme hält ein Ergebnis zurück"],
      ["motw_vod", "1 Match of the Week wartet auf das VOD"],
      ["replacements", "2 Ersatzspieler-Angebote sind offen"],
    ]);
    expect(blockers.every((b) => b.href.startsWith("/staff"))).toBe(true);
  });
});

// Division 1 (two title seats, one relegation seat) over Division 2 (one
// relegation seat). 1: a tie of two at the title boundary; 2: a tie of three
// across the relegation boundary.
const tables = new Map([
  [
    1,
    [
      finalTable({
        tier: 1,
        subDivisionId: null,
        groupPosition: null,
        groupLot: null,
        rows: [
          { userId: "a", rank: 1, dropped: false, lot: 0 },
          { userId: "b", rank: 2, dropped: false, lot: 0 },
          { userId: "c", rank: 2, dropped: false, lot: 0 },
          { userId: "d", rank: 4, dropped: false, lot: 0 },
        ],
        counts: { ...NONE, champion: 2, demotionPlayoff: 1 },
      }),
    ],
  ],
  [
    2,
    [
      finalTable({
        tier: 2,
        subDivisionId: null,
        groupPosition: null,
        groupLot: null,
        rows: [
          { userId: "e", rank: 1, dropped: false, lot: 0 },
          { userId: "f", rank: 1, dropped: false, lot: 0 },
          { userId: "g", rank: 1, dropped: false, lot: 0 },
        ],
        counts: { ...NONE, promotionPlayoff: 1 },
      }),
    ],
  ],
]);

describe("tiebreakersToCreate", () => {
  it("creates a match for each two-player boundary tie only", () => {
    expect(tiebreakersToCreate(tables)).toEqual([
      {
        tieKey: "division:1:1",
        tier: 1,
        position: 1,
        playerAId: "b",
        playerBId: "c",
      },
    ]);
  });
});

describe("tieDecisions", () => {
  it("orders a tiebreaker's winner first, empties a double loss, keeps staff orders", () => {
    const decided = tieDecisions({
      tiebreakers: [
        {
          tieKey: "t1",
          playerAId: "b",
          playerBId: "c",
          outcome: "won",
          winnerId: "c",
        },
        {
          tieKey: "t2",
          playerAId: "x",
          playerBId: "y",
          outcome: "double_loss",
          winnerId: null,
        },
        {
          tieKey: "t3",
          playerAId: "p",
          playerBId: "q",
          outcome: null,
          winnerId: null,
        },
      ],
      orders: [{ tieKey: "t4", order: ["g", "e", "f"] }],
    });
    expect([...decided.entries()]).toEqual([
      ["t1", ["c", "b"]],
      ["t2", "vacant"],
      ["t4", ["g", "e", "f"]],
    ]);
  });
});
