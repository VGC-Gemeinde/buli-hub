import { hasSchedule } from "@/features/schedule/queries";
import { getSeeding } from "@/features/seeding/queries";
import { latestWindow } from "@/features/staff/queries";
import { registrationState } from "@/features/staff/registration-window";
import { type SeasonPhase, seasonPhase } from "@/features/staff/season-phase";

export type CurrentSeason = {
  window: Awaited<ReturnType<typeof latestWindow>>;
  phase: SeasonPhase;
};

// Resolves the latest window and its lifecycle phase from the same signals the
// root page uses (registration state → finalized seeding → schedule). Shared so
// the header and the landing/overview page agree on "a season is running".
export async function currentSeason(): Promise<CurrentSeason> {
  const window = await latestWindow();
  const state = window ? registrationState(window, new Date()) : "not_started";
  const seeding =
    window && state === "closed" ? await getSeeding(window.id) : null;
  const scheduleExists =
    window && seeding?.finalizedAt ? await hasSchedule(window.id) : false;
  const phase = seasonPhase({
    registration: state,
    seedingFinalized: Boolean(seeding?.finalizedAt),
    hasSchedule: scheduleExists,
  });
  return { window, phase };
}

// True while the regular season is live — the public overview replaces the
// landing page and signed-in users get the "Liga" nav entry (§3.3).
export async function seasonIsRunning(): Promise<boolean> {
  return (await currentSeason()).phase === "regular_season";
}
