"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { latestWindow } from "@/features/staff/queries";
import { registrationState } from "@/features/staff/registration-window";
import {
  autoDivisionPlacements,
  seedingReadiness,
  suggestedDivisionCount,
} from "./placement";
import {
  assignPlayersToDivision,
  assignPlayerToDivision,
  createDivisions,
  divisionBelongsToWindow,
  generateSubDivisionsForDivision,
  getSeeding,
  listDivisions,
  listSeedingPlayers,
  movePlayerToSubDivision,
  publishSeeding as persistPublish,
  placePlayersInGroup,
  saveSeedingConfig,
  subDivisionDivisionId,
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

// Shared gate for editing the seeding: staff, registration closed, not yet
// published. Returns the window id or an error.
async function editableWindow(): Promise<
  { ok: true; windowId: string } | { ok: false; error: string }
> {
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
  return { ok: true, windowId: window.id };
}

// First-open setup: derive the division count from the largest previous
// division any returning player reported, create those divisions, and place
// returning players back into their old division (placement/relegation is
// ignored for now). Idempotent — a no-op once divisions exist, so it never
// clobbers manual work. `initialized` says whether it changed anything.
export async function initializeSeeding(): Promise<
  { ok: true; initialized: boolean } | { ok: false; error: string }
> {
  const gate = await editableWindow();
  if (!gate.ok) {
    return gate;
  }

  const existing = await listDivisions(gate.windowId);
  if (existing.length > 0) {
    return { ok: true, initialized: false };
  }

  const players = await listSeedingPlayers(gate.windowId);
  const count = suggestedDivisionCount(players);
  if (count < 1) {
    return { ok: true, initialized: false };
  }

  await createDivisions(gate.windowId, count);
  const created = await listDivisions(gate.windowId);
  const idByTier = new Map(created.map((d) => [d.tier, d.id]));

  // Group the placements by tier so each division is one bulk assignment.
  const usersByTier = new Map<number, string[]>();
  for (const { userId, tier } of autoDivisionPlacements(players, count)) {
    const list = usersByTier.get(tier);
    if (list) {
      list.push(userId);
    } else {
      usersByTier.set(tier, [userId]);
    }
  }
  for (const [tier, userIds] of usersByTier) {
    const divisionId = idByTier.get(tier);
    if (divisionId) {
      await assignPlayersToDivision(gate.windowId, userIds, divisionId);
    }
  }

  revalidatePath("/staff/seeding");
  return { ok: true, initialized: true };
}

export async function generateGroups(input: {
  divisionId: string;
}): Promise<SeedingResult> {
  const gate = await editableWindow();
  if (!gate.ok) {
    return gate;
  }
  if (!(await getSeeding(gate.windowId))) {
    return { ok: false, error: "Bitte zuerst eine Gruppengröße festlegen" };
  }
  if (!(await divisionBelongsToWindow(gate.windowId, input.divisionId))) {
    return { ok: false, error: "Unbekannte Division" };
  }

  await generateSubDivisionsForDivision(gate.windowId, input.divisionId);
  revalidatePath("/staff/seeding");
  return { ok: true };
}

export async function moveToSubDivision(input: {
  userId: string;
  subDivisionId: string;
}): Promise<SeedingResult> {
  const gate = await editableWindow();
  if (!gate.ok) {
    return gate;
  }

  // The target sub-division must belong to a division of this window.
  const divisionId = await subDivisionDivisionId(input.subDivisionId);
  if (
    divisionId === null ||
    !(await divisionBelongsToWindow(gate.windowId, divisionId))
  ) {
    return { ok: false, error: "Unbekannte Gruppe" };
  }

  await movePlayerToSubDivision(
    gate.windowId,
    input.userId,
    input.subDivisionId,
  );
  revalidatePath("/staff/seeding");
  return { ok: true };
}

export async function assignManyToDivision(input: {
  userIds: string[];
  divisionId: string | null;
}): Promise<SeedingResult> {
  const gate = await editableWindow();
  if (!gate.ok) {
    return gate;
  }
  if (
    input.divisionId !== null &&
    !(await divisionBelongsToWindow(gate.windowId, input.divisionId))
  ) {
    return { ok: false, error: "Unbekannte Division" };
  }
  await assignPlayersToDivision(gate.windowId, input.userIds, input.divisionId);
  revalidatePath("/staff/seeding");
  return { ok: true };
}

// Drag & drop lands players on an exact placement. A drop onto a group sets
// both fields; onto a division separator or „Nicht platziert" the group is
// null. Validates that a chosen group actually belongs to the chosen division.
export async function placePlayers(input: {
  userIds: string[];
  divisionId: string | null;
  subDivisionId: string | null;
}): Promise<SeedingResult> {
  const gate = await editableWindow();
  if (!gate.ok) {
    return gate;
  }
  if (
    input.divisionId !== null &&
    !(await divisionBelongsToWindow(gate.windowId, input.divisionId))
  ) {
    return { ok: false, error: "Unbekannte Division" };
  }
  if (input.subDivisionId !== null) {
    const divisionId = await subDivisionDivisionId(input.subDivisionId);
    if (divisionId === null || divisionId !== input.divisionId) {
      return { ok: false, error: "Unbekannte Gruppe" };
    }
  }
  await placePlayersInGroup(
    gate.windowId,
    input.userIds,
    input.divisionId,
    input.subDivisionId,
  );
  revalidatePath("/staff/seeding");
  return { ok: true };
}

export async function generateAllGroups(): Promise<SeedingResult> {
  const gate = await editableWindow();
  if (!gate.ok) {
    return gate;
  }
  if (!(await getSeeding(gate.windowId))) {
    return { ok: false, error: "Bitte zuerst eine Gruppengröße festlegen" };
  }
  for (const division of await listDivisions(gate.windowId)) {
    await generateSubDivisionsForDivision(gate.windowId, division.id);
  }
  revalidatePath("/staff/seeding");
  return { ok: true };
}

export async function publishSeeding(): Promise<SeedingResult> {
  const gate = await editableWindow();
  if (!gate.ok) {
    return gate;
  }

  // Never publish an incomplete seeding — every player must be in a group.
  const readiness = seedingReadiness(await listSeedingPlayers(gate.windowId));
  if (!readiness.ready) {
    return {
      ok: false,
      error: "Alle Spieler müssen einer Gruppe zugeordnet sein",
    };
  }

  await persistPublish(gate.windowId);
  revalidatePath("/staff/seeding");
  return { ok: true };
}
