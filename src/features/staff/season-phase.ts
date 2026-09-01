import type { RegistrationState } from "./registration-window";

// The season's lifecycle phase, derived (no status column) from the registration
// state, whether the seeding is finalized, whether a schedule exists, and
// whether it has been published — the same "derive, don't store" approach as
// `registrationState`.
export type SeasonPhase =
  | "not_started"
  | "registration_open"
  | "registration_closed"
  | "seeded"
  | "schedule_hidden"
  | "regular_season";

export function seasonPhase(input: {
  registration: RegistrationState;
  seedingFinalized: boolean;
  hasSchedule: boolean;
  schedulePublished: boolean;
}): SeasonPhase {
  // A schedule only exists once the seeding is finalized, so its presence is
  // the strongest signal. Until staff publish the pairings it is staff-internal
  // (schedule_hidden — players still see the seeded state); published, the
  // regular season is running.
  if (input.hasSchedule) {
    return input.schedulePublished ? "regular_season" : "schedule_hidden";
  }
  if (input.registration === "not_started") {
    return "not_started";
  }
  if (input.registration === "open") {
    return "registration_open";
  }
  return input.seedingFinalized ? "seeded" : "registration_closed";
}
