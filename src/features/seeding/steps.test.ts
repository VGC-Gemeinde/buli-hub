import { describe, expect, it } from "vitest";
import {
  finalizeGateHint,
  finalizeGateShort,
  type RulesEditorStatus,
  rulesStepSublabel,
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
    replayConfigured: true,
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

  it("marks the rules done out of order when saved before grouping", () => {
    expect(
      states(progress({ placed: 20, grouped: 3, postSeasonConfigured: true })),
    ).toEqual({
      place: "done",
      group: "active",
      post_season: "done",
      finalize: "pending",
    });
  });

  it("keeps the rules step open until the replay decision is made", () => {
    expect(
      states(
        progress({
          placed: 20,
          grouped: 20,
          postSeasonConfigured: true,
          replayConfigured: false,
        }),
      ),
    ).toEqual({
      place: "done",
      group: "done",
      post_season: "active",
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

  it("asks for the replay decision after the rules", () => {
    expect(
      finalizeGateHint(
        progress({
          placed: 20,
          grouped: 20,
          postSeasonConfigured: true,
          replayConfigured: false,
        }),
      ),
    ).toBe("Erst festlegen, bis zu welcher Division Replays Pflicht sind.");
  });

  it("warns about finality when everything is ready", () => {
    expect(
      finalizeGateHint(
        progress({ placed: 20, grouped: 20, postSeasonConfigured: true }),
      ),
    ).toBe("Endgültig — kann nicht rückgängig gemacht werden.");
  });
});

describe("finalizeGateShort", () => {
  it("reports an empty season", () => {
    expect(finalizeGateShort(progress({ total: 0 }))).toBe("Keine Anmeldungen");
  });

  it("counts the unplaced players first", () => {
    expect(finalizeGateShort(progress({ placed: 12, grouped: 5 }))).toBe(
      "Noch 8 platzieren",
    );
  });

  it("counts the ungrouped players once everyone is placed", () => {
    expect(finalizeGateShort(progress({ placed: 20, grouped: 15 }))).toBe(
      "Noch 5 ohne Gruppe",
    );
  });

  it("asks for the rules once everyone is grouped", () => {
    expect(finalizeGateShort(progress({ placed: 20, grouped: 20 }))).toBe(
      "Auf- & Abstieg speichern",
    );
  });

  it("asks for the replay decision after the rules", () => {
    expect(
      finalizeGateShort(
        progress({
          placed: 20,
          grouped: 20,
          postSeasonConfigured: true,
          replayConfigured: false,
        }),
      ),
    ).toBe("Replay-Pflicht festlegen");
  });

  it("is null when nothing blocks", () => {
    expect(
      finalizeGateShort(
        progress({ placed: 20, grouped: 20, postSeasonConfigured: true }),
      ),
    ).toBeNull();
  });
});

describe("rulesStepSublabel", () => {
  const status = (
    overrides: Partial<RulesEditorStatus>,
  ): RulesEditorStatus => ({
    configured: false,
    replayConfigured: true,
    dirty: false,
    noGroups: false,
    issueCount: 0,
    ...overrides,
  });

  it("reports fully saved rules", () => {
    expect(rulesStepSublabel(status({ configured: true }))).toEqual({
      text: "Regeln gespeichert",
      warn: false,
    });
  });

  it("flags unsaved edits on top of saved rules", () => {
    expect(
      rulesStepSublabel(status({ configured: true, dirty: true })),
    ).toEqual({ text: "Änderungen nicht gespeichert", warn: false });
  });

  it("points to grouping while groups are missing", () => {
    expect(rulesStepSublabel(status({ noGroups: true }))).toEqual({
      text: "Zuerst Gruppen bilden",
      warn: false,
    });
  });

  it("counts open validation issues with singular/plural", () => {
    expect(rulesStepSublabel(status({ issueCount: 1 }))).toEqual({
      text: "1 Punkt zu klären",
      warn: true,
    });
    expect(rulesStepSublabel(status({ issueCount: 3 }))).toEqual({
      text: "3 Punkte zu klären",
      warn: true,
    });
  });

  it("asks to save the ladder when valid but unsaved", () => {
    expect(rulesStepSublabel(status({}))).toEqual({
      text: "Auf- & Abstieg speichern",
      warn: false,
    });
  });

  it("asks for the replay decision once the ladder is saved", () => {
    expect(
      rulesStepSublabel(status({ configured: true, replayConfigured: false })),
    ).toEqual({ text: "Replay-Pflicht festlegen", warn: false });
  });

  it("the ladder comes first when both are open", () => {
    expect(rulesStepSublabel(status({ replayConfigured: false }))).toEqual({
      text: "Auf- & Abstieg speichern",
      warn: false,
    });
  });
});
