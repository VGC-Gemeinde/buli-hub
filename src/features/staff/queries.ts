import { desc } from "drizzle-orm";
import { registrationWindows } from "@/db/schema";
import { hasSchedule } from "@/features/schedule/queries";
import { getSeeding } from "@/features/seeding/queries";
import { db } from "@/lib/db";
import {
  type RegistrationState,
  type RegistrationWindow,
  registrationState,
} from "./registration-window";
import { type SeasonPhase, seasonPhase } from "./season-phase";

export async function latestWindow(): Promise<RegistrationWindow | null> {
  const row = await db.query.registrationWindows.findFirst({
    orderBy: desc(registrationWindows.openedAt),
  });
  return row ?? null;
}

// The one recipe that derives a window's season phase (there is no status
// column): registration state → seeding finalized → schedule exists. The
// intermediate facts are returned too, because the staff dashboard renders
// from them directly.
export async function windowSeasonPhase(window: RegistrationWindow): Promise<{
  phase: SeasonPhase;
  registration: RegistrationState;
  seedingFinalized: boolean;
}> {
  const registration = registrationState(window, new Date());
  const seeding =
    registration === "closed" ? await getSeeding(window.id) : null;
  const seedingFinalized = Boolean(seeding?.finalizedAt);
  const scheduleExists = seedingFinalized
    ? await hasSchedule(window.id)
    : false;
  return {
    phase: seasonPhase({
      registration,
      seedingFinalized,
      hasSchedule: scheduleExists,
      schedulePublished: window.schedulePublishedAt !== null,
    }),
    registration,
    seedingFinalized,
  };
}

export async function createWindow(
  closesAt: Date,
  openedBy: string,
  seasonNumber: number,
): Promise<void> {
  await db
    .insert(registrationWindows)
    .values({ closesAt, openedBy, seasonNumber });
}
