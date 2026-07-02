import { z } from "zod";

export type RegistrationWindow = {
  id: string;
  openedAt: Date;
  closesAt: Date;
  openedBy: string;
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

// The phrase staff must type to confirm opening the registration.
export const OPEN_CONFIRMATION_PHRASE = "Anmeldung öffnen";

export function matchesConfirmationPhrase(input: string): boolean {
  return input.trim() === OPEN_CONFIRMATION_PHRASE;
}

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
    confirmation: z
      .string()
      .refine(matchesConfirmationPhrase, { error: "Bestätigung stimmt nicht" }),
  });
}
