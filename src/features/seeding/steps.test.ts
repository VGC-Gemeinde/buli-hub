import { describe, expect, it } from "vitest";
import {
  finalizeGateHint,
  type SeedingProgress,
  type SeedingStepId,
  seedingSteps,
} from "./steps";

function progress(overrides: Partial<SeedingProgress> = {}): SeedingProgress {
  return {
    total: 20,
    placed: 0,
    grouped: 0,
    postSeasonConfigured: false,
    finalized: false,
    ...overrides,
  };
}

function states(p: SeedingProgress): Record<SeedingStepId, string> {
  return Object.fromEntries(
    seedingSteps(p).map((s) => [s.id, s.state]),
  ) as Record<SeedingStepId, string>;
}

describe("seedingSteps", () => {
  it("keeps the workflow order place → group → post_season → finalize", () => {
    expect(seedingSteps(progress()).map((s) => s.id)).toEqual([
      "place",
      "group",
      "post_season",
      "finalize",
    ]);
  });

  it("starts with placing active and everything else pending", () => {
    expect(states(progress())).toEqual({
      place: "active",
      group: "pending",
      post_season: "pending",
      finalize: "pending",
    });
  });

  it("carries the player counts on the counting steps", () => {
    const steps = seedingSteps(progress({ placed: 12, grouped: 5 }));
    expect(steps.find((s) => s.id === "place")?.count).toEqual({
      done: 12,
      total: 20,
    });
    expect(steps.find((s) => s.id === "group")?.count).toEqual({
      done: 5,
      total: 20,
    });
    expect(steps.find((s) => s.id === "post_season")?.count).toBeUndefined();
    expect(steps.find((s) => s.id === "finalize")?.count).toBeUndefined();
  });

  it("keeps placing active until every player has a division", () => {
    expect(states(progress({ placed: 19 })).place).toBe("active");
  });

  it("moves on to grouping once everyone is placed", () => {
    expect(states(progress({ placed: 20, grouped: 3 }))).toEqual({
      place: "done",
      group: "active",
      post_season: "pending",
      finalize: "pending",
    });
  });

  it("marks post-season done out of order when saved before grouping", () => {
    expect(
      states(progress({ placed: 20, grouped: 3, postSeasonConfigured: true })),
    ).toEqual({
      place: "done",
      group: "active",
      post_season: "done",
      finalize: "pending",
    });
  });

  it("activates finalize when everything else is done", () => {
    expect(
      states(progress({ placed: 20, grouped: 20, postSeasonConfigured: true })),
    ).toEqual({
      place: "done",
      group: "done",
      post_season: "done",
      finalize: "active",
    });
  });

  it("shows everything done once finalized", () => {
    expect(
      states(
        progress({
          placed: 20,
          grouped: 20,
          postSeasonConfigured: true,
          finalized: true,
        }),
      ),
    ).toEqual({
      place: "done",
      group: "done",
      post_season: "done",
      finalize: "done",
    });
  });

  it("never counts an empty season as placed or grouped", () => {
    expect(states(progress({ total: 0 }))).toEqual({
      place: "active",
      group: "pending",
      post_season: "pending",
      finalize: "pending",
    });
  });
});

describe("finalizeGateHint", () => {
  it("asks for placement and grouping first, with the counts", () => {
    expect(finalizeGateHint(progress({ placed: 12, grouped: 5 }))).toBe(
      "Erst möglich, wenn alle Spieler platziert (12/20) und in Gruppen (5/20) sind.",
    );
  });

  it("treats an empty season as not ready", () => {
    expect(finalizeGateHint(progress({ total: 0 }))).toBe(
      "Erst möglich, wenn alle Spieler platziert (0/0) und in Gruppen (0/0) sind.",
    );
  });

  it("asks for the post-season rules once everyone is grouped", () => {
    expect(finalizeGateHint(progress({ placed: 20, grouped: 20 }))).toBe(
      "Erst die Auf- und Abstiegsregeln festlegen und speichern.",
    );
  });

  it("warns about finality when everything is ready", () => {
    expect(
      finalizeGateHint(
        progress({ placed: 20, grouped: 20, postSeasonConfigured: true }),
      ),
    ).toBe("Endgültig — kann nicht rückgängig gemacht werden.");
  });
});
