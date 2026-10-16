// Where Relegation und Playoffs stand, as the four steps staff take
// (docs/plans/relegation-and-playoffs.md): create the schedule, publish,
// play, complete the season. Pure.

export const STAFF_STEPS = [
  "Spielplan erstellen",
  "Veröffentlichen",
  "Spielen",
  "Saison abschließen",
] as const;

// The index of the step that is next; STAFF_STEPS.length once the season
// is complete.
export function staffStep(input: {
  created: boolean;
  published: boolean;
  completed: boolean;
}): number {
  if (input.completed) {
    return STAFF_STEPS.length;
  }
  if (input.published) {
    return 2;
  }
  return input.created ? 1 : 0;
}
