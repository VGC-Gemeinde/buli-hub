import { describe, expect, it } from "vitest";
import type { SeasonPhase } from "@/features/staff/season-phase";
import { cancellationBlocked } from "./cancellation";

describe("cancellationBlocked", () => {
  it("allows cancelling only between Anmeldeschluss and finalized seeding", () => {
    expect(cancellationBlocked("registration_closed")).toBeNull();
  });

  it("refuses every other phase with a reason", () => {
    const refused: SeasonPhase[] = [
      "not_started",
      "registration_open",
      "seeded",
      "regular_season",
    ];
    for (const phase of refused) {
      expect(cancellationBlocked(phase)).toEqual(expect.any(String));
    }
  });

  it("points to the drop flow once the seeding is finalized", () => {
    expect(cancellationBlocked("seeded")).toContain("Drop");
    expect(cancellationBlocked("regular_season")).toContain("Drop");
  });
});
