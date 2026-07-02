import { z } from "zod";
import { platformEnum } from "@/db/schema";

export type Platform = (typeof platformEnum.enumValues)[number];
export type PlayerStatus = "returning" | "new";

export const PLATFORM_LABELS: Record<Platform, string> = {
  showdown: "Pokémon Showdown",
  cartridge: "Cartridge (Pokémon Champions)",
};

/**
 * Resolves the registration branch from detection + self-report:
 * - detected returning → returning, no extra questions
 * - not detected, „ja" → returning, veteran-history questions
 * - not detected, „nein" → new, new-player questions
 * `participatedBefore` is only meaningful when not detected; it must be
 * answered there (null → the form is incomplete).
 */
export function resolvePlayerStatus(input: {
  detectedReturning: boolean;
  participatedBefore: boolean | null;
}): { status: PlayerStatus; needsVeteranHistory: boolean } | null {
  if (input.detectedReturning) {
    return { status: "returning", needsVeteranHistory: false };
  }
  if (input.participatedBefore === true) {
    return { status: "returning", needsVeteranHistory: true };
  }
  if (input.participatedBefore === false) {
    return { status: "new", needsVeteranHistory: false };
  }
  return null;
}

// Detection from our own data: any registration in an earlier window.
export function isReturningPlayer(priorRegistrationCount: number): boolean {
  return priorRegistrationCount > 0;
}

// The profile hint nudges players who have neither provided profile info nor
// dismissed it. Both signals are timestamps on the profile (null = not yet).
export function shouldShowProfileHint(
  profile: {
    settingsEditedAt: Date | null;
    registrationHintDismissedAt: Date | null;
  } | null,
): boolean {
  if (!profile) {
    return true;
  }
  return (
    profile.settingsEditedAt === null &&
    profile.registrationHintDismissedAt === null
  );
}

export const platformSchema = z.enum(platformEnum.enumValues, {
  error: "Bitte eine Plattform wählen",
});

export const veteranHistorySchema = z.object({
  prevSeason: z.string().trim().min(1, "Pflichtfeld").max(200),
  prevName: z.string().trim().min(1, "Pflichtfeld").max(200),
  prevDivision: z.string().trim().min(1, "Pflichtfeld").max(200),
  prevPlacement: z.string().trim().min(1, "Pflichtfeld").max(200),
});

export const newPlayerSchema = z.object({
  skillSelfRating: z
    .number({ error: "Bitte eine Einschätzung abgeben" })
    .int()
    .min(0, "0–10")
    .max(10, "0–10"),
  greatestAchievements: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value === "" ? null : value))
    .nullable(),
});

export type VeteranHistory = z.output<typeof veteranHistorySchema>;
export type NewPlayerAnswers = z.output<typeof newPlayerSchema>;
