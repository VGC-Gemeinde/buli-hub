"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import type { Identity } from "@/features/season/dashboard";
import { fetchDiscordUser } from "@/lib/discord";
import { playerName } from "@/lib/player-name";
import { type BanConflict, banGuard, parseDiscordId } from "./bans";
import { banConflictsForUser } from "./conflict-queries";
import {
  banAccount,
  discordIdOfUser,
  hubUserByDiscordId,
  isBanned,
  liftBan,
} from "./queries";

export type BanActionResult = { ok: true } | { ok: false; error: string };

// Bans change who may register and who shows up as a replacement candidate.
function revalidate() {
  revalidatePath("/staff/banliste");
  revalidatePath("/staff");
  revalidatePath("/anmeldung");
  revalidatePath("/spieler");
}

async function staffGate() {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return null;
  }
  return current;
}

// The dialog's re-check after staff resolved something in another tab.
export async function banConflictsFor(input: {
  userId: string;
}): Promise<BanConflict[]> {
  if (!(await staffGate())) {
    return [];
  }
  return banConflictsForUser(input.userId);
}

// What a typed Discord-ID stands for: a hub user (then the dialog continues
// as if they had been picked, conflicts included), or an account the hub has
// never seen, named by a Discord lookup if that works.
export type BanTargetLookup =
  | { ok: false; error: string }
  | {
      ok: true;
      kind: "hub";
      person: Identity & { username: string | null };
      conflicts: BanConflict[];
    }
  | {
      ok: true;
      kind: "external";
      discordId: string;
      // null when the lookup could not run or found nobody: the ban still
      // works, shown by id.
      person: {
        name: string;
        username: string;
        avatarUrl: string | null;
      } | null;
      notFound: boolean;
    };

export async function lookupBanTarget(input: {
  discordId: string;
}): Promise<BanTargetLookup> {
  if (!(await staffGate())) {
    return { ok: false, error: "Keine Berechtigung" };
  }
  const discordId = parseDiscordId(input.discordId);
  if (!discordId) {
    return {
      ok: false,
      error: "Das ist keine Discord-ID. Sie besteht aus 17 bis 20 Ziffern.",
    };
  }
  if (await isBanned(discordId)) {
    return { ok: false, error: "Dieser Account ist bereits gebannt" };
  }
  const hubUser = await hubUserByDiscordId(discordId);
  if (hubUser) {
    return {
      ok: true,
      kind: "hub",
      person: hubUser,
      conflicts: await banConflictsForUser(hubUser.userId),
    };
  }
  try {
    const user = await fetchDiscordUser(discordId);
    return {
      ok: true,
      kind: "external",
      discordId,
      person: user
        ? {
            name: playerName(user.globalName, user.username),
            username: user.username,
            avatarUrl: user.avatarUrl,
          }
        : null,
      notFound: user === null,
    };
  } catch {
    // No token locally, an outage: the ban does not depend on the name.
    return {
      ok: true,
      kind: "external",
      discordId,
      person: null,
      notFound: false,
    };
  }
}

// Bans an account, named either as a hub user or by Discord-ID. Conflicts in
// the current season are recomputed here, so a stale dialog cannot skip
// them: they must be gone or acknowledged.
export async function banPlayer(input: {
  target: { userId: string } | { discordId: string };
  reason: string;
  acknowledgedConflicts: boolean;
}): Promise<BanActionResult> {
  const current = await staffGate();
  if (!current) {
    return { ok: false, error: "Keine Berechtigung" };
  }

  const discordId =
    "userId" in input.target
      ? await discordIdOfUser(input.target.userId)
      : parseDiscordId(input.target.discordId);
  if (!discordId) {
    return {
      ok: false,
      error:
        "userId" in input.target
          ? "Dieses Konto hat keine Discord-ID und kann nicht gebannt werden"
          : "Das ist keine Discord-ID",
    };
  }

  // Whoever holds this Discord id in the hub, however the ban named them:
  // their name is the snapshot and their season state the conflicts.
  const hubUser = await hubUserByDiscordId(discordId);
  let snapshotName = hubUser?.name ?? null;
  if (!hubUser) {
    try {
      const user = await fetchDiscordUser(discordId);
      snapshotName = user ? playerName(user.globalName, user.username) : null;
    } catch {
      snapshotName = null;
    }
  }

  const conflicts = hubUser ? await banConflictsForUser(hubUser.userId) : [];
  const refusal = banGuard({
    reason: input.reason,
    alreadyBanned: await isBanned(discordId),
    self: current.discordId === discordId,
    conflicts: conflicts.length,
    acknowledged: input.acknowledgedConflicts,
  });
  if (refusal) {
    return { ok: false, error: refusal };
  }

  try {
    await banAccount({
      discordId,
      discordName: snapshotName,
      reason: input.reason.trim(),
      bannedById: current.userId,
    });
  } catch {
    // The partial unique index: someone else banned the account meanwhile.
    return { ok: false, error: "Dieser Account ist bereits gebannt" };
  }
  revalidate();
  return { ok: true };
}

export async function liftBanAction(input: {
  banId: string;
}): Promise<BanActionResult> {
  const current = await staffGate();
  if (!current) {
    return { ok: false, error: "Keine Berechtigung" };
  }
  if (!(await liftBan(input.banId, current.userId))) {
    return { ok: false, error: "Dieser Ban ist bereits aufgehoben" };
  }
  revalidate();
  return { ok: true };
}
