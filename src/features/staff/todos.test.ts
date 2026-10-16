import { describe, expect, it } from "vitest";
import { staffTodos, type TodoFacts } from "./todos";

const calm: TodoFacts = {
  phase: "regular_season",
  overdue: 0,
  disputedMatchIds: [],
  pendingFreeWins: 0,
  staleRecordings: null,
  motw: null,
  publish: null,
  discord: null,
  nonMembers: 0,
  scheduleSetup: null,
  relegationPlayoffsSetup: null,
  motwLineUpChanged: null,
  relegationPlayoffsPublish: null,
  tieOrdersOpen: 0,
  seasonCompletable: false,
};

const ids = (facts: Partial<TodoFacts>) =>
  staffTodos({ ...calm, ...facts }).map((todo) => todo.id);

describe("staffTodos", () => {
  it("asks to publish Relegation und Playoffs, naming what is open", () => {
    const [ready] = staffTodos({
      ...calm,
      relegationPlayoffsPublish: { openPoints: 0 },
    });
    expect(ready).toMatchObject({
      id: "relegation-playoffs-publish",
      title: "Relegation und Playoffs veröffentlichen",
      action: { href: "/staff/relegation-playoffs" },
    });
    const [blocked] = staffTodos({
      ...calm,
      relegationPlayoffsPublish: { openPoints: 2 },
    });
    expect(blocked.detail).toBe(
      "2 Punkte sind noch offen, bevor veröffentlicht werden kann.",
    );
  });

  it("asks to complete the season once everything is decided", () => {
    expect(staffTodos({ ...calm, seasonCompletable: true })[0]).toMatchObject({
      id: "complete-season",
      title: "Saison abschließen",
    });
  });

  it("asks for open staff orders", () => {
    expect(staffTodos({ ...calm, tieOrdersOpen: 2 })[0].title).toBe(
      "Reihenfolge für 2 Gleichstände festlegen",
    );
  });

  it("names a week after the regular season in the MotW todo", () => {
    expect(
      staffTodos({
        ...calm,
        motw: {
          round: 10,
          name: "Woche 1",
          kind: "nominate",
          urgency: "urgent",
        },
      })[0],
    ).toMatchObject({
      title: "Kandidaten für Woche 1 wählen",
      detail: "Woche 1 läuft noch ohne Kandidaten für das Match of the Week.",
      action: { href: "/staff/motw?spieltag=10" },
    });
  });

  it("flags candidates whose line-up moved", () => {
    expect(
      staffTodos({
        ...calm,
        motwLineUpChanged: { count: 1, round: 10, name: "Woche 1" },
      })[0],
    ).toMatchObject({
      id: "motw-line-up",
      title: "Besetzung eines MotW-Kandidaten in Woche 1 hat sich geändert",
      action: { href: "/staff/motw?spieltag=10" },
    });
  });

  it("asks for the Relegation und Playoffs schedule with the dialog", () => {
    const [todo] = staffTodos({
      ...calm,
      relegationPlayoffsSetup: { weeks: 3, matches: 11 },
    });
    expect(todo).toMatchObject({
      id: "relegation-playoffs-schedule",
      tone: "due",
      title: "Spielplan für Relegation und Playoffs erstellen",
      action: { kind: "create_relegation_playoffs_schedule" },
    });
    expect(todo.detail).toMatch(/^3 Wochen · 11 Matches\./);
  });

  it("has nothing to do in a calm week", () => {
    expect(staffTodos(calm)).toEqual([]);
  });

  it("puts urgent items before due ones", () => {
    const todos = staffTodos({
      ...calm,
      nonMembers: 2,
      pendingFreeWins: 1,
      overdue: 3,
      motw: {
        round: 3,
        name: "Spieltag 3",
        kind: "nominate",
        urgency: "warning",
      },
      staleRecordings: { count: 1, allReported: true },
    });
    expect(todos.map((t) => [t.id, t.tone])).toEqual([
      ["overdue", "urgent"],
      ["recordings", "urgent"],
      ["motw", "due"],
      ["freewins", "due"],
      ["membership", "due"],
    ]);
  });

  it("counts in the title, singular and plural", () => {
    expect(staffTodos({ ...calm, overdue: 1 })[0].title).toBe(
      "1 Match ist überfällig",
    );
    expect(staffTodos({ ...calm, overdue: 4 })[0].title).toBe(
      "4 Matches sind überfällig",
    );
    expect(staffTodos({ ...calm, nonMembers: 1 })[0].title).toContain(
      "Ein angemeldeter Spieler",
    );
  });

  it("links a single dispute straight to its match, several to the list", () => {
    expect(staffTodos({ ...calm, disputedMatchIds: ["m1"] })[0].action).toEqual(
      { kind: "link", href: "/match/m1", label: "Prüfen" },
    );
    expect(
      staffTodos({ ...calm, disputedMatchIds: ["m1", "m2"] })[0].action,
    ).toMatchObject({ href: "/staff/woche#angefochten" });
  });

  it("makes an urgent MotW duty red and a coming one orange", () => {
    expect(
      staffTodos({
        ...calm,
        motw: {
          round: 2,
          name: "Spieltag 2",
          kind: "confirm",
          urgency: "urgent",
        },
      })[0],
    ).toMatchObject({
      tone: "urgent",
      title: "Match of the Week für Spieltag 2 bestätigen",
      action: { href: "/staff/motw?spieltag=2", label: "Jetzt bestätigen" },
    });
  });

  it("offers the Discord sync with the skip lines", () => {
    const [todo] = staffTodos({
      ...calm,
      discord: { kind: "attention", summary: "3 von 4 Gruppen", lines: ["x"] },
    });
    expect(todo).toMatchObject({
      id: "discord",
      detail: "3 von 4 Gruppen",
      lines: ["x"],
      action: { kind: "discord_sync" },
    });
  });

  it("leads through the pre-season", () => {
    expect(ids({ phase: "registration_closed" })).toEqual(["seeding"]);
    expect(
      staffTodos({
        ...calm,
        phase: "seeded",
        scheduleSetup: { groups: 18, rounds: 7, matches: 504 },
      })[0],
    ).toMatchObject({
      id: "schedule",
      detail: expect.stringContaining("18 Gruppen · 7 Spieltage · 504 Spiele"),
      action: { kind: "create_schedule" },
    });
    expect(staffTodos({ ...calm, phase: "seeded" })[0].action).toMatchObject({
      kind: "link",
      href: "/staff/seeding",
    });
    expect(
      ids({
        phase: "schedule_hidden",
        publish: { rounds: 7, matches: 504 },
      }),
    ).toEqual(["publish"]);
  });
});
