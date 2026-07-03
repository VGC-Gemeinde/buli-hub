import type { RegistrationState } from "./registration-window";

// The season's lifecycle phase, derived (no status column) from the registration
// state, whether the seeding is finalized, and whether a schedule exists — the
// same "derive, don't store" approach as `registrationState`.
export type SeasonPhase =
  | "not_started"
  | "registration_open"
  | "registration_closed"
  | "seeded"
  | "regular_season";

export function seasonPhase(input: {
  registration: RegistrationState;
  seedingFinalized: boolean;
  hasSchedule: boolean;
}): SeasonPhase {
  // A schedule only exists once the seeding is finalized, so its presence is the
  // strongest signal — the regular season is running.
  if (input.hasSchedule) {
    return "regular_season";
  }
  if (input.registration === "not_started") {
    return "not_started";
  }
  if (input.registration === "open") {
    return "registration_open";
  }
  return input.seedingFinalized ? "seeded" : "registration_closed";
}
