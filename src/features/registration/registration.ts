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

/**
 * A whole-number field that validates the *typed string*, not a coerced number.
 *
 * Two reasons it cannot be `z.coerce.number()`. First, the form's inputs are
 * text inputs on purpose: an `<input type="number">` reports "" for anything
 * the browser cannot parse, so „3b" would arrive here as an empty field and no
 * message could ever name the real problem. Second, coercion turns "" into 0
 * and „1e2" into 100, which makes an untouched field report „Mindestens 1" and
 * gibberish report „Höchstens 30". Starting from the string keeps „nicht
 * ausgefüllt" and „keine Zahl" distinguishable. Output is a number, so the
 * seeding tool and the integer columns are unaffected.
 */
function wholeNumberField(max: number, tooBig: string) {
  return z
    .string()
    .trim()
    .min(1, "Pflichtfeld")
    .regex(/^\d+$/, "Bitte nur Ziffern eingeben, zum Beispiel 3")
    .transform(Number)
    .pipe(z.number().min(1, "Mindestens 1").max(max, tooBig));
}

// Division and placement are tracked as numbers so the seeding tool can work
// with them directly (prefill the divisions, auto-place returning players).
export const veteranHistorySchema = z.object({
  prevSeason: z
    .string()
    .trim()
    .min(1, "Pflichtfeld")
    .max(200, "Höchstens 200 Zeichen"),
  prevName: z
    .string()
    .trim()
    .min(1, "Pflichtfeld")
    .max(200, "Höchstens 200 Zeichen"),
  prevDivision: wholeNumberField(30, "Höchstens 30"),
  prevPlacement: wholeNumberField(500, "Höchstens 500"),
});

export const newPlayerSchema = z.object({
  // null is „slider never touched". 0 is a real answer („blutiger Anfänger"),
  // so the two cannot share a representation: a player who means 0 and a
  // player who skipped the question would otherwise be indistinguishable.
  skillSelfRating: z
    .number({ error: "Bitte deine Einschätzung abgeben" })
    .int("Bitte eine ganze Zahl")
    .min(0, "Bitte einen Wert zwischen 0 und 10 wählen")
    .max(10, "Bitte einen Wert zwischen 0 und 10 wählen"),
  greatestAchievements: z
    .string()
    .trim()
    .max(2000, "Höchstens 2000 Zeichen")
    .transform((value) => (value === "" ? null : value))
    .nullable(),
});

export type VeteranHistory = z.output<typeof veteranHistorySchema>;
export type NewPlayerAnswers = z.output<typeof newPlayerSchema>;

/**
 * The form as the player has filled it in so far: every answer in the shape
 * the controls produce (numbers as typed strings, „not answered yet" as null).
 * `detectedReturning` is server-derived and added to the draft on arrival, so
 * the client cannot talk itself into the no-questions branch.
 */
export const registrationDraftSchema = z.object({
  platform: z.string(),
  participatedBefore: z.boolean().nullable(),
  veteran: z.object({
    prevSeason: z.string(),
    prevName: z.string(),
    prevDivision: z.string(),
    prevPlacement: z.string(),
  }),
  skillSelfRating: z.number().nullable(),
  greatestAchievements: z.string(),
  acceptedRules: z.boolean(),
});

export type RegistrationDraft = z.output<typeof registrationDraftSchema>;
export type VeteranDraft = RegistrationDraft["veteran"];

export const EMPTY_VETERAN_DRAFT: VeteranDraft = {
  prevSeason: "",
  prevName: "",
  prevDivision: "",
  prevPlacement: "",
};

// Source order, so „jump to the first problem" lands on the field the player
// would reach first when reading down the page.
export const REGISTRATION_FIELDS = [
  "platform",
  "participatedBefore",
  "prevSeason",
  "prevName",
  "prevDivision",
  "prevPlacement",
  "skillSelfRating",
  "greatestAchievements",
  "acceptedRules",
] as const;

export type RegistrationField = (typeof REGISTRATION_FIELDS)[number];
export type RegistrationFieldErrors = Partial<
  Record<RegistrationField, string>
>;

// Zod reports every failing check on a string; the player only wants the first
// one („Pflichtfeld" before „Bitte nur Ziffern eingeben").
function firstMessagePerField(error: z.ZodError): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {};
  for (const [field, messages] of Object.entries(
    z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
  )) {
    const first = messages?.[0];
    if (first) {
      errors[field as RegistrationField] = first;
    }
  }
  return errors;
}

/**
 * Validates a draft into per-field messages. Only the branch the player is
 * actually in is checked, so a new player is never held up by veteran fields
 * they cannot see. Shared by the form and the server action: one source of
 * truth for what counts as a complete registration.
 */
export function validateRegistration(
  draft: RegistrationDraft & { detectedReturning: boolean },
): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {};

  if (!platformSchema.safeParse(draft.platform).success) {
    errors.platform = "Bitte eine Plattform wählen";
  }

  const resolved = resolvePlayerStatus({
    detectedReturning: draft.detectedReturning,
    participatedBefore: draft.participatedBefore,
  });

  if (!resolved) {
    errors.participatedBefore =
      "Bitte wählen, ob du schon einmal teilgenommen hast";
  } else if (resolved.needsVeteranHistory) {
    const parsed = veteranHistorySchema.safeParse(draft.veteran);
    if (!parsed.success) {
      Object.assign(errors, firstMessagePerField(parsed.error));
    }
  } else if (resolved.status === "new") {
    const parsed = newPlayerSchema.safeParse({
      skillSelfRating: draft.skillSelfRating,
      greatestAchievements: draft.greatestAchievements,
    });
    if (!parsed.success) {
      Object.assign(errors, firstMessagePerField(parsed.error));
    }
  }

  if (!draft.acceptedRules) {
    errors.acceptedRules =
      "Bitte das Regelwerk akzeptieren, um dich anzumelden";
  }

  return errors;
}

export function firstErrorField(
  errors: RegistrationFieldErrors,
): RegistrationField | null {
  return REGISTRATION_FIELDS.find((field) => errors[field]) ?? null;
}
