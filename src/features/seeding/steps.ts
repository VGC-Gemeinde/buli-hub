// The staff-facing progress model of the seeding workflow: which steps are
// done and which one is next. Drives the toolbar step bar and the finalize
// gate hint, so both always tell the same story.

export type SeedingStepId = "place" | "group" | "post_season" | "finalize";

export type SeedingStepState = "done" | "active" | "pending";

export type SeedingStep = {
  id: SeedingStepId;
  label: string;
  state: SeedingStepState;
  // Player progress for the counting steps (place, group).
  count?: { done: number; total: number };
};

export type SeedingProgress = {
  total: number;
  placed: number;
  grouped: number;
  postSeasonConfigured: boolean;
  finalized: boolean;
};

// Steps complete independently of each other (the post-season rules can be
// saved before the last player is grouped); "active" is the first incomplete
// step in workflow order, everything incomplete behind it stays "pending".
export function seedingSteps(progress: SeedingProgress): SeedingStep[] {
  const { total, placed, grouped, postSeasonConfigured, finalized } = progress;
  const complete: Record<SeedingStepId, boolean> = {
    place: total > 0 && placed === total,
    group: total > 0 && grouped === total,
    post_season: postSeasonConfigured,
    finalize: finalized,
  };
  const steps: SeedingStep[] = [
    {
      id: "place",
      label: "Platzieren",
      state: "pending",
      count: { done: placed, total },
    },
    {
      id: "group",
      label: "In Gruppen",
      state: "pending",
      count: { done: grouped, total },
    },
    { id: "post_season", label: "Auf- & Abstieg", state: "pending" },
    { id: "finalize", label: "Finalisieren", state: "pending" },
  ];
  let activeAssigned = false;
  for (const step of steps) {
    if (complete[step.id]) {
      step.state = "done";
    } else if (!activeAssigned) {
      step.state = "active";
      activeAssigned = true;
    }
  }
  return steps;
}

// Why the finalize button is (still) gated — same inputs as the step bar.
export function finalizeGateHint(progress: SeedingProgress): string {
  const { total, placed, grouped, postSeasonConfigured } = progress;
  if (total === 0 || grouped < total) {
    return `Erst möglich, wenn alle Spieler platziert (${placed}/${total}) und in Gruppen (${grouped}/${total}) sind.`;
  }
  if (!postSeasonConfigured) {
    return "Erst die Auf- und Abstiegsregeln festlegen und speichern.";
  }
  return "Endgültig — kann nicht rückgängig gemacht werden.";
}
