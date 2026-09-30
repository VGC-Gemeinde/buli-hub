import { describe, expect, it } from "vitest";
import { staffNav } from "./nav";
import type { SeasonPhase } from "./season-phase";

const labels = (phase: SeasonPhase, role: "staff" | "admin" = "staff") =>
  staffNav({ phase, role }).map((group) => ({
    scope: group.scope,
    labels: group.entries.map((entry) => entry.label),
  }));

describe("staffNav", () => {
  it("offers only the overview and the hub before a season", () => {
    expect(labels("not_started")).toEqual([
      { scope: "overview", labels: ["Übersicht"] },
      { scope: "hub", labels: ["Banliste"] },
    ]);
  });

  it("adds the participants while registration is open", () => {
    expect(labels("registration_open")).toContainEqual({
      scope: "season",
      labels: ["Teilnehmer"],
    });
  });

  it("adds the divisions once registration is closed", () => {
    expect(labels("registration_closed")).toContainEqual({
      scope: "season",
      labels: ["Teilnehmer", "Divisionen"],
    });
    expect(labels("seeded")).toContainEqual({
      scope: "season",
      labels: ["Teilnehmer", "Divisionen"],
    });
  });

  it("offers the week and the whole season once a schedule exists", () => {
    for (const phase of ["schedule_hidden", "regular_season"] as const) {
      expect(labels(phase)).toEqual([
        { scope: "overview", labels: ["Übersicht"] },
        { scope: "week", labels: ["Woche", "Aufnahmen"] },
        {
          scope: "season",
          labels: [
            "Teilnehmer",
            "Divisionen",
            "Spielplan",
            "Match of the Week",
          ],
        },
        { scope: "hub", labels: ["Banliste"] },
      ]);
    }
  });

  it("shows the usage stats to admins only", () => {
    expect(labels("regular_season", "admin").at(-1)).toEqual({
      scope: "hub",
      labels: ["Banliste", "Nutzung"],
    });
  });
});
