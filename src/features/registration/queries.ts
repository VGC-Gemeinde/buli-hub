import { and, count, desc, eq, ne } from "drizzle-orm";
import { profiles, registrations } from "@/db/schema";
import { db } from "@/lib/db";
import type {
  NewPlayerAnswers,
  Platform,
  PlayerStatus,
  VeteranHistory,
} from "./registration";

export type NewRegistration = {
  windowId: string;
  userId: string;
  platform: Platform;
  status: PlayerStatus;
  participatedBefore: boolean | null;
  veteran: VeteranHistory | null;
  newPlayer: NewPlayerAnswers | null;
};

export async function getRegistration(windowId: string, userId: string) {
  return (
    (await db.query.registrations.findFirst({
      where: and(
        eq(registrations.windowId, windowId),
        eq(registrations.userId, userId),
      ),
    })) ?? null
  );
}

// Detection: does the user have a registration in any *other* window?
export async function priorRegistrationCount(
  windowId: string,
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(registrations)
    .where(
      and(
        eq(registrations.userId, userId),
        ne(registrations.windowId, windowId),
      ),
    );
  return row?.value ?? 0;
}

export async function createRegistration(input: NewRegistration) {
  await db.insert(registrations).values({
    windowId: input.windowId,
    userId: input.userId,
    platform: input.platform,
    status: input.status,
    participatedBefore: input.participatedBefore,
    prevSeason: input.veteran?.prevSeason ?? null,
    prevName: input.veteran?.prevName ?? null,
    prevDivision: input.veteran?.prevDivision ?? null,
    prevPlacement: input.veteran?.prevPlacement ?? null,
    skillSelfRating: input.newPlayer?.skillSelfRating ?? null,
    greatestAchievements: input.newPlayer?.greatestAchievements ?? null,
  });
}

export async function deleteRegistration(windowId: string, userId: string) {
  await db
    .delete(registrations)
    .where(
      and(
        eq(registrations.windowId, windowId),
        eq(registrations.userId, userId),
      ),
    );
}

// Roster for staff: registered players joined to their stored identity.
export async function listRegistrations(windowId: string) {
  return db
    .select({
      id: registrations.id,
      userId: registrations.userId,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
      createdAt: registrations.createdAt,
    })
    .from(registrations)
    .leftJoin(profiles, eq(profiles.userId, registrations.userId))
    .where(eq(registrations.windowId, windowId))
    .orderBy(desc(registrations.createdAt));
}

export async function dismissProfileHint(userId: string) {
  const dismissedAt = new Date();
  await db
    .insert(profiles)
    .values({ userId, registrationHintDismissedAt: dismissedAt })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { registrationHintDismissedAt: dismissedAt },
    });
}

export async function countRegistrations(windowId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(registrations)
    .where(eq(registrations.windowId, windowId));
  return row?.value ?? 0;
}
