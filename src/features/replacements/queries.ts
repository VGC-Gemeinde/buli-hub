import { and, asc, eq, gte, isNotNull, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  divisions,
  matches,
  placements,
  playerReplacements,
  profiles,
  registrations,
  subDivisions,
} from "@/db/schema";
import {
  bannedUserIds,
  discordIdOfUser,
  isBanned,
} from "@/features/bans/queries";
import { recordAcceptance } from "@/features/regelwerk/queries";
import {
  type NewRegistration,
  registrationRow,
} from "@/features/registration/queries";
import type { Identity } from "@/features/season/dashboard";
import { subDivisionName } from "@/features/seeding/seeding";
import { db } from "@/lib/db";
import { PLAYER_NAME_FALLBACK, playerName } from "@/lib/player-name";
import type { AcceptedReplacement } from "./replacement";

function identity(row: {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}): Identity {
  return {
    userId: row.userId,
    name: playerName(row.displayName, row.username) || PLAYER_NAME_FALLBACK,
    avatarUrl: row.avatarUrl ?? null,
  };
}

// The accepted replacements of a window — what the tables and schedules
// need. Pending offers change nothing yet.
export async function acceptedReplacementsForWindow(
  windowId: string,
): Promise<AcceptedReplacement[]> {
  return db
    .select({
      replacedUserId: playerReplacements.replacedUserId,
      replacementUserId: playerReplacements.replacementUserId,
      entryRound: playerReplacements.entryRound,
    })
    .from(playerReplacements)
    .where(
      and(
        eq(playerReplacements.windowId, windowId),
        isNotNull(playerReplacements.acceptedAt),
      ),
    );
}

// The same for one group: the replaced player's placement names the group
// (the replacement sits in the same one).
export async function acceptedReplacementsForSubDivision(
  subDivisionId: string,
): Promise<AcceptedReplacement[]> {
  return db
    .select({
      replacedUserId: playerReplacements.replacedUserId,
      replacementUserId: playerReplacements.replacementUserId,
      entryRound: playerReplacements.entryRound,
    })
    .from(playerReplacements)
    .innerJoin(
      placements,
      and(
        eq(placements.windowId, playerReplacements.windowId),
        eq(placements.userId, playerReplacements.replacedUserId),
      ),
    )
    .where(
      and(
        eq(placements.subDivisionId, subDivisionId),
        isNotNull(playerReplacements.acceptedAt),
      ),
    );
}

// One replacement of a window, from either side, for the staff views and
// the profiles. `pending` while the offered user has not accepted.
export type ReplacementRow = {
  id: string;
  replaced: Identity;
  replacement: Identity;
  entryRound: number;
  offeredAt: Date;
  acceptedAt: Date | null;
};

export async function replacementsForWindow(
  windowId: string,
): Promise<ReplacementRow[]> {
  const replaced = alias(profiles, "replaced");
  const replacement = alias(profiles, "replacement");
  const rows = await db
    .select({
      id: playerReplacements.id,
      replacedUserId: playerReplacements.replacedUserId,
      replacedName: replaced.displayName,
      replacedUsername: replaced.username,
      replacedAvatar: replaced.avatarUrl,
      replacementUserId: playerReplacements.replacementUserId,
      replacementName: replacement.displayName,
      replacementUsername: replacement.username,
      replacementAvatar: replacement.avatarUrl,
      entryRound: playerReplacements.entryRound,
      offeredAt: playerReplacements.offeredAt,
      acceptedAt: playerReplacements.acceptedAt,
    })
    .from(playerReplacements)
    .leftJoin(replaced, eq(replaced.userId, playerReplacements.replacedUserId))
    .leftJoin(
      replacement,
      eq(replacement.userId, playerReplacements.replacementUserId),
    )
    .where(eq(playerReplacements.windowId, windowId))
    .orderBy(asc(playerReplacements.offeredAt));
  return rows.map((row) => ({
    id: row.id,
    replaced: identity({
      userId: row.replacedUserId,
      displayName: row.replacedName,
      username: row.replacedUsername,
      avatarUrl: row.replacedAvatar,
    }),
    replacement: identity({
      userId: row.replacementUserId,
      displayName: row.replacementName,
      username: row.replacementUsername,
      avatarUrl: row.replacementAvatar,
    }),
    entryRound: row.entryRound,
    offeredAt: row.offeredAt,
    acceptedAt: row.acceptedAt,
  }));
}

// Everything a staff offer has to check, in one read.
export async function offerContext(input: {
  windowId: string;
  replacedUserId: string;
  candidateUserId: string;
}): Promise<{
  replacedPlacement: {
    droppedAt: Date | null;
    subDivisionId: string | null;
  } | null;
  existing: "none" | "pending" | "accepted";
  candidateExists: boolean;
  candidatePlaced: boolean;
  candidateHasOffer: boolean;
  candidateBanned: boolean;
}> {
  const [
    replacedPlacement,
    existing,
    candidate,
    candidatePlacement,
    offer,
    candidateBanned,
  ] = await Promise.all([
    db.query.placements.findFirst({
      columns: { droppedAt: true, subDivisionId: true },
      where: and(
        eq(placements.windowId, input.windowId),
        eq(placements.userId, input.replacedUserId),
      ),
    }),
    db.query.playerReplacements.findFirst({
      columns: { acceptedAt: true },
      where: and(
        eq(playerReplacements.windowId, input.windowId),
        eq(playerReplacements.replacedUserId, input.replacedUserId),
      ),
    }),
    // "Signed in once" is what a profile row means: it is written on the
    // first sign-in's role sync.
    db.query.profiles.findFirst({
      columns: { userId: true },
      where: eq(profiles.userId, input.candidateUserId),
    }),
    db.query.placements.findFirst({
      columns: { id: true },
      where: and(
        eq(placements.windowId, input.windowId),
        eq(placements.userId, input.candidateUserId),
      ),
    }),
    db.query.playerReplacements.findFirst({
      columns: { id: true },
      where: and(
        eq(playerReplacements.windowId, input.windowId),
        eq(playerReplacements.replacementUserId, input.candidateUserId),
      ),
    }),
    discordIdOfUser(input.candidateUserId).then(isBanned),
  ]);
  return {
    replacedPlacement: replacedPlacement ?? null,
    existing: existing
      ? existing.acceptedAt
        ? "accepted"
        : "pending"
      : "none",
    candidateExists: candidate !== undefined,
    candidatePlaced: candidatePlacement !== undefined,
    candidateHasOffer: offer !== undefined,
    candidateBanned,
  };
}

// The people staff can offer a slot to: everyone who has signed in to the hub
// (has a profile), is not on the Banliste and is neither placed in the window
// nor already offered a slot in it. Registered-but-unplaced players are included; for them the
// acceptance overwrites the registration answers.
export type ReplacementCandidate = Identity & { username: string | null };

export async function replacementCandidates(
  windowId: string,
): Promise<ReplacementCandidate[]> {
  const banned = await bannedUserIds();
  const rows = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .leftJoin(
      placements,
      and(
        eq(placements.windowId, windowId),
        eq(placements.userId, profiles.userId),
      ),
    )
    .leftJoin(
      playerReplacements,
      and(
        eq(playerReplacements.windowId, windowId),
        eq(playerReplacements.replacementUserId, profiles.userId),
      ),
    )
    .where(and(isNull(placements.id), isNull(playerReplacements.id)));
  return rows
    .filter((row) => !banned.has(row.userId))
    .map((row) => ({ ...identity(row), username: row.username }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export async function createOffer(input: {
  windowId: string;
  replacedUserId: string;
  replacementUserId: string;
  offeredById: string;
  entryRound: number;
}): Promise<void> {
  await db.insert(playerReplacements).values(input);
}

// Withdraws a pending offer. An accepted replacement is not an offer any
// more and stays.
export async function deletePendingOffer(
  windowId: string,
  replacedUserId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(playerReplacements)
    .where(
      and(
        eq(playerReplacements.windowId, windowId),
        eq(playerReplacements.replacedUserId, replacedUserId),
        isNull(playerReplacements.acceptedAt),
      ),
    )
    .returning({ id: playerReplacements.id });
  return deleted.length > 0;
}

// Whether a player's slot has been taken over (the un-drop guard), or an
// offer for it is still open.
export async function replacementStateOf(
  windowId: string,
  replacedUserId: string,
): Promise<"none" | "pending" | "accepted"> {
  const row = await db.query.playerReplacements.findFirst({
    columns: { acceptedAt: true },
    where: and(
      eq(playerReplacements.windowId, windowId),
      eq(playerReplacements.replacedUserId, replacedUserId),
    ),
  });
  if (!row) {
    return "none";
  }
  return row.acceptedAt ? "accepted" : "pending";
}

// The open offer for a user in a window, with what the acceptance card shows.
export type PendingOffer = {
  replaced: Identity;
  subDivisionId: string;
  groupName: string;
  entryRound: number;
  offeredAt: Date;
};

export async function pendingOfferFor(
  windowId: string,
  userId: string,
): Promise<PendingOffer | null> {
  const [row] = await db
    .select({
      replacedUserId: playerReplacements.replacedUserId,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
      subDivisionId: subDivisions.id,
      tier: divisions.tier,
      position: subDivisions.position,
      entryRound: playerReplacements.entryRound,
      offeredAt: playerReplacements.offeredAt,
    })
    .from(playerReplacements)
    .innerJoin(
      placements,
      and(
        eq(placements.windowId, playerReplacements.windowId),
        eq(placements.userId, playerReplacements.replacedUserId),
      ),
    )
    .innerJoin(subDivisions, eq(subDivisions.id, placements.subDivisionId))
    .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .leftJoin(profiles, eq(profiles.userId, playerReplacements.replacedUserId))
    .where(
      and(
        eq(playerReplacements.windowId, windowId),
        eq(playerReplacements.replacementUserId, userId),
        isNull(playerReplacements.acceptedAt),
      ),
    )
    .limit(1);
  if (!row) {
    return null;
  }
  return {
    replaced: identity({
      userId: row.replacedUserId,
      displayName: row.displayName,
      username: row.username,
      avatarUrl: row.avatarUrl,
    }),
    subDivisionId: row.subDivisionId,
    groupName: subDivisionName(row.tier, row.position),
    entryRound: row.entryRound,
    offeredAt: row.offeredAt,
  };
}

// The acceptance, all or nothing: the registration (answers from the form),
// a placement in the replaced player's group, the slot's matches from the
// entry round on, and the stamp. Returns false when there is no pending
// offer (withdrawn meanwhile, or accepted twice).
export async function acceptOffer(input: {
  registration: NewRegistration;
  entryRound: number;
}): Promise<boolean> {
  const { windowId, userId } = input.registration;
  const accepted = await db.transaction(async (tx) => {
    const [offer] = await tx
      .select({
        id: playerReplacements.id,
        replacedUserId: playerReplacements.replacedUserId,
      })
      .from(playerReplacements)
      .where(
        and(
          eq(playerReplacements.windowId, windowId),
          eq(playerReplacements.replacementUserId, userId),
          isNull(playerReplacements.acceptedAt),
        ),
      )
      .for("update");
    if (!offer) {
      return false;
    }
    const [slot] = await tx
      .select({
        divisionId: placements.divisionId,
        subDivisionId: placements.subDivisionId,
      })
      .from(placements)
      .where(
        and(
          eq(placements.windowId, windowId),
          eq(placements.userId, offer.replacedUserId),
        ),
      );
    if (!slot?.subDivisionId) {
      return false;
    }

    const row = registrationRow(input.registration);
    await tx
      .insert(registrations)
      .values(row)
      .onConflictDoUpdate({
        target: [registrations.windowId, registrations.userId],
        set: {
          platform: row.platform,
          status: row.status,
          participatedBefore: row.participatedBefore,
          prevSeason: row.prevSeason,
          prevName: row.prevName,
          prevDivision: row.prevDivision,
          prevPlacement: row.prevPlacement,
          skillSelfRating: row.skillSelfRating,
          greatestAchievements: row.greatestAchievements,
        },
      });
    await tx.insert(placements).values({
      windowId,
      userId,
      divisionId: slot.divisionId,
      subDivisionId: slot.subDivisionId,
    });

    const slotMatches = and(
      eq(matches.subDivisionId, slot.subDivisionId),
      gte(matches.round, input.entryRound),
    );
    await tx
      .update(matches)
      .set({ playerAId: userId })
      .where(and(slotMatches, eq(matches.playerAId, offer.replacedUserId)));
    await tx
      .update(matches)
      .set({ playerBId: userId })
      .where(and(slotMatches, eq(matches.playerBId, offer.replacedUserId)));

    await tx
      .update(playerReplacements)
      .set({ acceptedAt: new Date(), entryRound: input.entryRound })
      .where(eq(playerReplacements.id, offer.id));
    return true;
  });
  if (accepted) {
    // The registration form carries the Regelwerk tick, so accepting the
    // slot is agreeing to the rules, exactly as registering is.
    await recordAcceptance(windowId, userId);
  }
  return accepted;
}
