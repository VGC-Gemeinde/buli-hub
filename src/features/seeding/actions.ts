"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { latestWindow } from "@/features/staff/queries";
import { registrationState } from "@/features/staff/registration-window";
import { type ControlState, controls, deriveControlState } from "./control";
import {
  autoDivisionPlacements,
  seedingReadiness,
  suggestedDivisionCount,
} from "./placement";
import { type PostSeasonIssue, validatePostSeason } from "./post-season";
import {
  assignPlayersToDivision,
  assignPlayerToDivision,
  bumpHeartbeat,
  createDivisions,
  divisionBelongsToWindow,
  divisionsWithGroupSizes,
  generateSubDivisionsForDivision,
  getLockWithHolder,
  getSeeding,
  listDivisions,
  listSeedingPlayers,
  movePlayerToSubDivision,
  finalizeSeeding as persistFinalize,
  savePostSeasonConfig as persistPostSeasonConfig,
  placePlayersInGroup,
  releaseLock,
  saveReplayRequirement,
  saveSeedingConfig,
  subDivisionDivisionId,
  upsertLock,
} from "./queries";
import {
  postSeasonConfigSchema,
  replayRequirementSchema,
  seedingConfigSchema,
} from "./seeding";

// `code: "no_control"` lets the client tell "you lost control" apart from other
// failures and flip its UI to read-only instead of only surfacing the error.
export type SeedingResult =
  | { ok: true }
  | { ok: false; error: string; code?: "no_control" };

export async function configureSeeding(input: {
  subDivisionSize: unknown;
  divisionCount: unknown;
}): Promise<SeedingResult> {
  const gate = await editableWindow();
  if (!gate.ok) {
    return gate;
  }

  const parsed = seedingConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }

  await saveSeedingConfig(
    gate.windowId,
    parsed.data.subDivisionSize,
    parsed.data.divisionCount,
  );
  revalidatePath("/staff/seeding");
  return { ok: true };
}

// The explicit per-season replay-requirement decision (proof mandatory for
// the top N divisions). Separate from `configureSeeding` on purpose: it must
// not clear the post-season stamp — the rule has nothing to do with groups.
export async function setReplayRequirement(input: {
  replayRequiredTiers: unknown;
}): Promise<SeedingResult> {
  const gate = await editableWindow();
  if (!gate.ok) {
    return gate;
  }

  const parsed = replayRequirementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }

  await saveReplayRequirement(gate.windowId, parsed.data.replayRequiredTiers);
  revalidatePath("/staff/seeding");
  return { ok: true };
}

// Saves the per-division post-season rules. Persists the columns regardless, but
// only stamps the "configured" confirmation (which gates finalize) when the whole
// config is valid. Returns the issues so the panel can show why it isn't valid.
export async function savePostSeason(input: {
  divisions: unknown;
}): Promise<
  | { ok: true; issues: PostSeasonIssue[] }
  | { ok: false; error: string; code?: "no_control" }
> {
  const gate = await editableWindow();
  if (!gate.ok) {
    return gate;
  }

  const parsed = postSeasonConfigSchema.safeParse(input.divisions);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }

  const withSizes = await divisionsWithGroupSizes(gate.windowId);
  const configById = new Map(parsed.data.map((c) => [c.divisionId, c]));
  const forValidation = [];
  for (const division of withSizes) {
    const config = configById.get(division.id);
    if (!config) {
      return { ok: false, error: "Konfiguration unvollständig" };
    }
    forValidation.push({
      tier: division.tier,
      groupSizes: division.groupSizes,
      relevantTable: config.relevantTable,
      guaranteedPromotions: config.guaranteedPromotions,
      guaranteedDemotions: config.guaranteedDemotions,
      promotionPlayoffSlots: config.promotionPlayoffSlots,
      demotionPlayoffSlots: config.demotionPlayoffSlots,
      championshipPlayoffSlots: config.championshipPlayoffSlots,
    });
  }

  const issues = validatePostSeason(forValidation);
  await persistPostSeasonConfig(
    gate.windowId,
    parsed.data,
    issues.length === 0,
  );
  revalidatePath("/staff/seeding");
  return { ok: true, issues };
}

export async function assignToDivision(input: {
  userId: string;
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

  await assignPlayerToDivision(gate.windowId, input.userId, input.divisionId);
  revalidatePath("/staff/seeding");
  return { ok: true };
}

// Shared gate for editing the seeding: staff, registration closed, not yet
// finalized, and — because seeding is a live meeting driven by one person — the
// caller must currently hold the control lock. Returns the window id or an
// error; `no_control` tells the client to flip to read-only.
async function editableWindow(): Promise<
  | { ok: true; windowId: string }
  | { ok: false; error: string; code?: "no_control" }
> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }
  const window = await latestWindow();
  if (!window || registrationState(window, new Date()) !== "closed") {
    return { ok: false, error: "Nicht möglich" };
  }
  if ((await getSeeding(window.id))?.finalizedAt) {
    return { ok: false, error: "Die Einteilung ist bereits finalisiert" };
  }

  const lock = await getLockWithHolder(window.id);
  const state = deriveControlState({
    lock,
    currentUserId: current.userId,
    now: new Date(),
  });
  if (!controls(state)) {
    return {
      ok: false,
      error: "Du steuerst die Einteilung gerade nicht.",
      code: "no_control",
    };
  }

  return { ok: true, windowId: window.id };
}

// First-open setup: derive the division count from the largest previous
// division any returning player reported, create those divisions, and place
// returning players back into their old division (placement/relegation is
// ignored for now). Idempotent — a no-op once divisions exist, so it never
// clobbers manual work. `initialized` says whether it changed anything.
//
// Runs on first page entry, before anyone takes control — so it uses the
// control-less gate (staff + closed + not finalized). The UI covers the page
// with a loader while it runs, so control cannot be taken until it is done.
export async function initializeSeeding(): Promise<
  { ok: true; initialized: boolean } | { ok: false; error: string }
> {
  const gate = await controllableWindow();
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
// both fields; onto a division separator or "Nicht platziert" the group is
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

export async function finalizeSeeding(): Promise<SeedingResult> {
  const gate = await editableWindow();
  if (!gate.ok) {
    return gate;
  }

  // Never finalize an incomplete seeding — every player must be in a group.
  const readiness = seedingReadiness(await listSeedingPlayers(gate.windowId));
  if (!readiness.ready) {
    return {
      ok: false,
      error: "Alle Spieler müssen einer Gruppe zugeordnet sein",
    };
  }

  // The post-season rules must have been explicitly configured (the stamp) and
  // must still be valid against the current groups.
  const seeding = await getSeeding(gate.windowId);
  if (!seeding?.postSeasonConfiguredAt) {
    return {
      ok: false,
      error: "Bitte zuerst die Auf- und Abstiegsregeln festlegen",
    };
  }
  // The replay requirement is an explicit per-season decision — a season must
  // never start without one (reporting validation depends on it).
  if (seeding.replayRequiredTiers === null) {
    return {
      ok: false,
      error: "Bitte zuerst die Replay-Pflicht festlegen",
    };
  }
  if (
    validatePostSeason(await divisionsWithGroupSizes(gate.windowId)).length > 0
  ) {
    return {
      ok: false,
      error: "Die Auf- und Abstiegsregeln sind nicht gültig",
    };
  }

  await persistFinalize(gate.windowId);
  revalidatePath("/staff/seeding");
  return { ok: true };
}

// The seeding page's current control view for the caller: whether they/someone
// drives, and who (for the observer banner).
export type ControlView = { state: ControlState; holderName: string | null };

// Preamble for the control actions: staff, registration closed, not finalized.
// Unlike `editableWindow` this does NOT require holding the lock — these actions
// grant, renew, or read it. A finalized seeding is read-only for everyone, so
// control is pointless there.
async function controllableWindow(): Promise<
  { ok: true; windowId: string; userId: string } | { ok: false; error: string }
> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }
  const window = await latestWindow();
  if (!window || registrationState(window, new Date()) !== "closed") {
    return { ok: false, error: "Nicht möglich" };
  }
  if ((await getSeeding(window.id))?.finalizedAt) {
    return { ok: false, error: "Die Einteilung ist bereits finalisiert" };
  }
  return { ok: true, windowId: window.id, userId: current.userId };
}

// Takes control of the seeding. A lock freshly held by someone else is only
// overwritten with `force: true` (the client confirms the takeover first).
export async function acquireControl(input: {
  force?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await controllableWindow();
  if (!gate.ok) {
    return gate;
  }

  const lock = await getLockWithHolder(gate.windowId);
  const state = deriveControlState({
    lock,
    currentUserId: gate.userId,
    now: new Date(),
  });
  if (state === "held-by-other" && !input.force) {
    return {
      ok: false,
      error: `${lock?.holderName ?? "Jemand anderes"} bearbeitet die Einteilung gerade.`,
    };
  }

  await upsertLock(gate.windowId, gate.userId);
  revalidatePath("/staff/seeding");
  return { ok: true };
}

// Returns the current control view and, while the caller is the holder, renews
// their heartbeat. Called on an interval by every open page: the controller
// stays alive, observers see holder changes and releases.
export async function pollControl(): Promise<ControlView> {
  const gate = await controllableWindow();
  if (!gate.ok) {
    return { state: "free", holderName: null };
  }

  const lock = await getLockWithHolder(gate.windowId);
  const state = deriveControlState({
    lock,
    currentUserId: gate.userId,
    now: new Date(),
  });
  if (controls(state)) {
    await bumpHeartbeat(gate.windowId, gate.userId);
  }
  return { state, holderName: lock?.holderName ?? null };
}

// Releases the caller's control (no-op if they no longer hold it).
export async function releaseControl(): Promise<{ ok: true }> {
  const gate = await controllableWindow();
  if (gate.ok) {
    await releaseLock(gate.windowId, gate.userId);
    revalidatePath("/staff/seeding");
  }
  return { ok: true };
}
