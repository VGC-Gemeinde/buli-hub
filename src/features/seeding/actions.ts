"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { latestWindow } from "@/features/staff/queries";
import { registrationState } from "@/features/staff/registration-window";
import {
  assignPlayerToDivision,
  divisionBelongsToWindow,
  getSeeding,
  saveSeedingConfig,
} from "./queries";
import { seedingConfigSchema } from "./seeding";

export type SeedingResult = { ok: true } | { ok: false; error: string };

export async function configureSeeding(input: {
  subDivisionSize: unknown;
  divisionCount: unknown;
}): Promise<SeedingResult> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }

  const window = await latestWindow();
  if (!window || registrationState(window, new Date()) !== "closed") {
    return {
      ok: false,
      error: "Die Einteilung ist erst nach Anmeldeschluss möglich",
    };
  }

  if ((await getSeeding(window.id))?.publishedAt) {
    return { ok: false, error: "Die Einteilung ist bereits veröffentlicht" };
  }

  const parsed = seedingConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }

  await saveSeedingConfig(
    window.id,
    parsed.data.subDivisionSize,
    parsed.data.divisionCount,
  );
  revalidatePath("/staff/seeding");
  return { ok: true };
}

export async function assignToDivision(input: {
  userId: string;
  divisionId: string | null;
}): Promise<SeedingResult> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }

  const window = await latestWindow();
  if (!window || registrationState(window, new Date()) !== "closed") {
    return { ok: false, error: "Nicht möglich" };
  }
  if ((await getSeeding(window.id))?.publishedAt) {
    return { ok: false, error: "Die Einteilung ist bereits veröffentlicht" };
  }

  if (
    input.divisionId !== null &&
    !(await divisionBelongsToWindow(window.id, input.divisionId))
  ) {
    return { ok: false, error: "Unbekannte Division" };
  }

  await assignPlayerToDivision(window.id, input.userId, input.divisionId);
  revalidatePath("/staff/seeding");
  return { ok: true };
}
