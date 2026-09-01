import { z } from "zod";

export type RegistrationWindow = {
  id: string;
  openedAt: Date;
  closesAt: Date;
  openedBy: string;
  seasonNumber: number;
  // Null until staff publish the generated schedule ("Pairings
  // veröffentlichen") — the schedule is staff-internal before that.
  schedulePublishedAt: Date | null;
};

export type RegistrationState = "not_started" | "open" | "closed";

// State is derived purely from the latest window and the current time — no
// status column, no scheduled job. The moment `now` passes `closesAt`, the
// registration is closed.
export function registrationState(
  window: RegistrationWindow | null,
  now: Date,
): RegistrationState {
  if (window === null) {
    return "not_started";
  }
  return window.closesAt.getTime() > now.getTime() ? "open" : "closed";
}

// The season's display name from its number.
export function seasonName(seasonNumber: number): string {
  return `Saison ${seasonNumber}`;
}

export const MIN_SEASON_NUMBER = 1;
export const MAX_SEASON_NUMBER = 999;

// The starting season number, entered once when the first window on the system
// is opened. Later windows derive their number (previous + 1), so this is not
// used for them.
export const seasonNumberSchema = z.coerce
  .number({ error: "Ungültige Zahl" })
  .int()
  .min(MIN_SEASON_NUMBER, `Mindestens ${MIN_SEASON_NUMBER}`)
  .max(MAX_SEASON_NUMBER, `Höchstens ${MAX_SEASON_NUMBER}`);

// Validates the open-registration input. The end date must be a valid,
// future instant; comparison against `now` is injected so the schema stays
// pure and testable.
export function openRegistrationSchema(now: Date) {
  return z.object({
    closesAt: z.coerce
      .date({ error: "Ungültiges Datum" })
      .refine((date) => date.getTime() > now.getTime(), {
        error: "Das Enddatum muss in der Zukunft liegen",
      }),
  });
}
