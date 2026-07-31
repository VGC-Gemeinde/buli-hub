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
  newPlayerSchema,
  platformSchema,
  resolvePlayerStatus,
  veteranHistorySchema,
} from "./registration";

export type RegisterResult = { ok: true } | { ok: false; error: string };

export type RegisterInput = {
  platform: unknown;
  participatedBefore: boolean | null;
  veteran?: unknown;
  newPlayer?: unknown;
};

export async function register(input: RegisterInput): Promise<RegisterResult> {
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

  const platform = platformSchema.safeParse(input.platform);
  if (!platform.success) {
    return { ok: false, error: "Bitte eine Plattform wählen" };
  }

  // Detection is server-side — never trust the client on returning status.
  const detectedReturning =
    (await priorRegistrationCount(window.id, user.id)) > 0;
  const resolved = resolvePlayerStatus({
    detectedReturning,
    participatedBefore: input.participatedBefore,
  });
  if (!resolved) {
    return { ok: false, error: "Bitte die Frage zur Teilnahme beantworten" };
  }

  let veteran = null;
  let newPlayer = null;

  if (resolved.needsVeteranHistory) {
    const parsed = veteranHistorySchema.safeParse(input.veteran);
    if (!parsed.success) {
      return { ok: false, error: "Bitte alle Felder zur Historie ausfüllen" };
    }
    veteran = parsed.data;
  } else if (resolved.status === "new") {
    const parsed = newPlayerSchema.safeParse(input.newPlayer);
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
    participatedBefore: detectedReturning ? null : input.participatedBefore,
    veteran,
    newPlayer,
  });

  // Registering means accepting: the form gates its own submit on the
  // Regelwerk checkbox, so anyone who gets here has agreed. Recording it now
  // is what makes „since when" answerable for the whole field, rather than
  // only for the players who later opened a prompt.
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
  revalidatePath("/anmeldung");
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
