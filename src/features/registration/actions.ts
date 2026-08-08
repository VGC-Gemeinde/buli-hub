"use server";

import { revalidatePath } from "next/cache";
import {
  clearAcceptance,
  recordAcceptance,
} from "@/features/regelwerk/queries";
import { latestWindow } from "@/features/staff/queries";
import { registrationState } from "@/features/staff/registration-window";
import { createClient } from "@/lib/supabase/server";
import {
  createRegistration,
  deleteRegistration,
  dismissProfileHint,
  getRegistration,
  priorRegistrationCount,
} from "./queries";
import {
  firstErrorField,
  newPlayerSchema,
  platformSchema,
  type RegistrationDraft,
  type RegistrationFieldErrors,
  registrationDraftSchema,
  resolvePlayerStatus,
  validateRegistration,
  veteranHistorySchema,
} from "./registration";

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: RegistrationFieldErrors };

export type RegisterInput = RegistrationDraft;

export async function register(input: unknown): Promise<RegisterResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Nicht angemeldet" };
  }

  const window = await latestWindow();
  if (!window || registrationState(window, new Date()) !== "open") {
    return { ok: false, error: "Die Anmeldung ist nicht geöffnet" };
  }

  if (await getRegistration(window.id, user.id)) {
    return { ok: false, error: "Du bist bereits angemeldet" };
  }

  const draft = registrationDraftSchema.safeParse(input);
  if (!draft.success) {
    return { ok: false, error: "Die Anmeldung konnte nicht gelesen werden" };
  }

  // Detection is server-side — never trust the client on returning status.
  const detectedReturning =
    (await priorRegistrationCount(window.id, user.id)) > 0;

  // The same validator the form runs, so a stale client gets field-precise
  // messages instead of one generic sentence, and the two cannot drift.
  const fieldErrors = validateRegistration({
    ...draft.data,
    detectedReturning,
  });
  if (firstErrorField(fieldErrors)) {
    return {
      ok: false,
      error: "Bitte prüfe die markierten Felder.",
      fieldErrors,
    };
  }

  const platform = platformSchema.safeParse(draft.data.platform);
  const resolved = resolvePlayerStatus({
    detectedReturning,
    participatedBefore: draft.data.participatedBefore,
  });
  if (!platform.success || !resolved) {
    return { ok: false, error: "Die Anmeldung konnte nicht gelesen werden" };
  }

  // Re-parsed rather than assumed: validation above only produced messages,
  // these calls produce the typed values the columns need.
  let veteran = null;
  let newPlayer = null;

  if (resolved.needsVeteranHistory) {
    const parsed = veteranHistorySchema.safeParse(draft.data.veteran);
    if (!parsed.success) {
      return { ok: false, error: "Bitte alle Felder zur Historie ausfüllen" };
    }
    veteran = parsed.data;
  } else if (resolved.status === "new") {
    const parsed = newPlayerSchema.safeParse({
      skillSelfRating: draft.data.skillSelfRating,
      greatestAchievements: draft.data.greatestAchievements,
    });
    if (!parsed.success) {
      return { ok: false, error: "Bitte deine Einschätzung abgeben" };
    }
    newPlayer = parsed.data;
  }

  await createRegistration({
    windowId: window.id,
    userId: user.id,
    platform: platform.data,
    status: resolved.status,
    // Store the self-report only when it drove the decision.
    participatedBefore: detectedReturning
      ? null
      : draft.data.participatedBefore,
    veteran,
    newPlayer,
  });

  // Registering means accepting: `validateRegistration` rejects a draft whose
  // Regelwerk tick is missing, so anyone who gets here has agreed. Recording
  // it now is what makes "since when" answerable for the whole field, rather
  // than only for the players who later opened a prompt.
  await recordAcceptance(window.id, user.id);

  revalidatePath("/anmeldung");
  revalidatePath("/staff");
  revalidatePath("/regelwerk");
  return { ok: true };
}

export async function dismissRegistrationHint(): Promise<RegisterResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Nicht angemeldet" };
  }
  await dismissProfileHint(user.id);
  // The hint appears on both surfaces; drop the cached HTML for each.
  revalidatePath("/anmeldung");
  revalidatePath("/spieler");
  return { ok: true };
}

export async function withdraw(): Promise<RegisterResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Nicht angemeldet" };
  }

  const window = await latestWindow();
  if (!window || registrationState(window, new Date()) !== "open") {
    return { ok: false, error: "Die Anmeldung ist nicht geöffnet" };
  }

  await deleteRegistration(window.id, user.id);
  // The acceptance goes with it. It was given as part of registering, so
  // leaving it behind would mean someone who is not in the season still counts
  // as having agreed to its rules — and a later re-registration would silently
  // reuse the old agreement instead of asking again.
  await clearAcceptance(window.id, user.id);

  revalidatePath("/anmeldung");
  revalidatePath("/staff");
  revalidatePath("/regelwerk");
  return { ok: true };
}
