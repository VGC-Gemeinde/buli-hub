"use server";

import { revalidatePath } from "next/cache";
import { banBlock } from "@/features/bans/bans";
import { isBanned } from "@/features/bans/queries";
import { syncSeasonDiscord } from "@/features/discord-season/converge";
import { membershipBlock } from "@/features/membership/membership";
import { priorRegistrationCount } from "@/features/registration/queries";
import {
  parseRegistration,
  type RegistrationFieldErrors,
} from "@/features/registration/registration";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { matchdaysForWindow } from "@/features/season/queries";
import { currentSeason } from "@/features/season/season-status";
import { germanToday } from "@/lib/german-time";
import {
  acceptOffer,
  createOffer,
  deletePendingOffer,
  offerContext,
  pendingOfferFor,
} from "./queries";
import {
  effectiveEntryRound,
  entryRoundChoices,
  offerBlock,
} from "./replacement";

export type ReplacementActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: RegistrationFieldErrors };

// A replacement changes tables, schedules, profiles and the staff lists.
function revalidate() {
  revalidatePath("/");
  revalidatePath("/spieler");
  revalidatePath("/spieler/[userId]", "page");
  revalidatePath("/staff");
  revalidatePath("/staff/motw");
  revalidatePath("/match/[matchId]", "page");
}

// Replacements exist only in the running season: before that, joining is a
// registration; the matches to take over exist once the schedule is public.
async function runningWindow() {
  const { window, phase } = await currentSeason();
  return window && phase === "regular_season" ? window : null;
}

// Staff offer a dropped player's slot to someone who has signed in to the hub,
// with the entry round (running or next matchday). Nothing changes until the
// offered user accepts.
export async function offerReplacement(input: {
  replacedUserId: string;
  candidateUserId: string;
  entryRound: number;
}): Promise<ReplacementActionResult> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }
  const window = await runningWindow();
  if (!window) {
    return { ok: false, error: "Keine laufende Saison" };
  }
  const [context, matchdays] = await Promise.all([
    offerContext({
      windowId: window.id,
      replacedUserId: input.replacedUserId,
      candidateUserId: input.candidateUserId,
    }),
    matchdaysForWindow(window.id),
  ]);
  const choices = entryRoundChoices(matchdays, germanToday());
  const blocked = offerBlock({
    replacedHasGroup: Boolean(context.replacedPlacement?.subDivisionId),
    replacedDropped: Boolean(context.replacedPlacement?.droppedAt),
    existing: context.existing,
    candidateExists: context.candidateExists,
    candidatePlaced: context.candidatePlaced,
    candidateHasOffer: context.candidateHasOffer,
    candidateBanned: context.candidateBanned,
    entryRoundOffered: choices.some((c) => c.round === input.entryRound),
  });
  if (blocked) {
    return { ok: false, error: blocked };
  }
  await createOffer({
    windowId: window.id,
    replacedUserId: input.replacedUserId,
    replacementUserId: input.candidateUserId,
    offeredById: current.userId,
    entryRound: input.entryRound,
  });
  revalidate();
  return { ok: true };
}

// Takes back an offer that has not been accepted yet.
export async function withdrawReplacement(input: {
  replacedUserId: string;
}): Promise<ReplacementActionResult> {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }
  const window = await runningWindow();
  if (!window) {
    return { ok: false, error: "Keine laufende Saison" };
  }
  const deleted = await deletePendingOffer(window.id, input.replacedUserId);
  if (!deleted) {
    return { ok: false, error: "Kein offenes Angebot für diesen Spieler" };
  }
  revalidate();
  return { ok: true };
}

// The offered user takes the slot: the same answers as a registration, then
// one transaction moves the matches from the entry round on onto them. Gated
// on server membership exactly like registering.
export async function acceptReplacement(
  input: unknown,
): Promise<ReplacementActionResult> {
  const current = await currentUser();
  if (!current) {
    return { ok: false, error: "Nicht angemeldet" };
  }
  const window = await runningWindow();
  if (!window) {
    return { ok: false, error: "Keine laufende Saison" };
  }
  const offer = await pendingOfferFor(window.id, current.userId);
  if (!offer) {
    return {
      ok: false,
      error: "Das Angebot gibt es nicht mehr. Sprich mit dem Staff.",
    };
  }
  const blocked = membershipBlock(current.guildMember);
  if (blocked) {
    return blocked;
  }
  // Taking over a slot is a way into the season like registering, so a ban
  // placed after the offer still stops it (docs/plans/banlist.md).
  const banned = banBlock(await isBanned(current.discordId));
  if (banned) {
    return banned;
  }

  const detectedReturning =
    (await priorRegistrationCount(window.id, current.userId)) > 0;
  const parsed = parseRegistration(input, detectedReturning);
  if (!parsed.ok) {
    return parsed;
  }

  const entryRound = effectiveEntryRound(
    offer.entryRound,
    await matchdaysForWindow(window.id),
    germanToday(),
  );
  if (entryRound === null) {
    return {
      ok: false,
      error:
        "Die Saison hat keinen Spieltag mehr, an dem du einsteigen kannst.",
    };
  }

  const accepted = await acceptOffer({
    registration: {
      windowId: window.id,
      userId: current.userId,
      ...parsed.values,
    },
    entryRound,
  });
  if (!accepted) {
    return {
      ok: false,
      error: "Das Angebot gibt es nicht mehr. Sprich mit dem Staff.",
    };
  }

  // Role and group channel right away rather than on the next scheduled
  // run, so the new player can reach their group today. Never throws; a
  // missed run is caught by the periodic sync.
  await syncSeasonDiscord(window.id);

  revalidate();
  revalidatePath("/anmeldung");
  revalidatePath("/regelwerk");
  return { ok: true };
}
