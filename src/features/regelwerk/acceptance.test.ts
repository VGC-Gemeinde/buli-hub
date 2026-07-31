import { describe, expect, it } from "vitest";
import {
  type AcceptanceInput,
  actionsLocked,
  regelwerkPrompt,
} from "@/features/regelwerk/acceptance";
import type { SeasonPhase } from "@/features/staff/season-phase";

const PHASES: SeasonPhase[] = [
  "not_started",
  "registration_open",
  "registration_closed",
  "seeded",
  "regular_season",
];

function input(overrides: Partial<AcceptanceInput> = {}): AcceptanceInput {
  return {
    phase: "registration_open",
    isRegistered: true,
    hasAccepted: false,
    ...overrides,
  };
}

describe("regelwerkPrompt", () => {
  it("asks nothing of a player who already accepted, in any phase", () => {
    for (const phase of PHASES) {
      expect(regelwerkPrompt(input({ phase, hasAccepted: true }))).toBe("none");
    }
  });

  // They meet the acceptance checkbox at registration instead; prompting here
  // would ask the same person twice.
  it("asks nothing of someone who is not registered", () => {
    for (const phase of PHASES) {
      expect(regelwerkPrompt(input({ phase, isRegistered: false }))).toBe(
        "none",
      );
    }
  });

  it("reminds a registered player before the season runs", () => {
    expect(regelwerkPrompt(input({ phase: "registration_open" }))).toBe(
      "reminder",
    );
    expect(regelwerkPrompt(input({ phase: "registration_closed" }))).toBe(
      "reminder",
    );
    expect(regelwerkPrompt(input({ phase: "seeded" }))).toBe("reminder");
  });

  it("gates once the season is running", () => {
    expect(regelwerkPrompt(input({ phase: "regular_season" }))).toBe("gate");
  });

  // A registration left over from a season that has since been replaced.
  it("asks nothing when no season has started", () => {
    expect(regelwerkPrompt(input({ phase: "not_started" }))).toBe("none");
  });

  it("covers every phase", () => {
    for (const phase of PHASES) {
      expect(["none", "reminder", "gate"]).toContain(
        regelwerkPrompt(input({ phase })),
      );
    }
  });
});

describe("actionsLocked", () => {
  it("locks an unaccepted player once the season is running", () => {
    expect(actionsLocked({ phase: "regular_season", hasAccepted: false })).toBe(
      true,
    );
  });

  it("never locks a player who accepted", () => {
    for (const phase of PHASES) {
      expect(actionsLocked({ phase, hasAccepted: true })).toBe(false);
    }
  });

  // Player actions do not exist before the season runs; locking then would be
  // reporting a problem that cannot occur.
  it("never locks before the season runs", () => {
    for (const phase of PHASES.filter((p) => p !== "regular_season")) {
      expect(actionsLocked({ phase, hasAccepted: false })).toBe(false);
    }
  });

  // The lock must not depend on the registration row: the actions already
  // verify the caller is in the match, and a participant with a missing or
  // odd registration must still be stopped.
  it("does not consult the registration", () => {
    expect(actionsLocked({ phase: "regular_season", hasAccepted: false })).toBe(
      regelwerkPrompt(input({ phase: "regular_season" })) === "gate",
    );
  });
});
