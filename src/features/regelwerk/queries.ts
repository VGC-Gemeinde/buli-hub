import { and, eq } from "drizzle-orm";
import { regelwerkAcceptances } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * When this user accepted the given season's Regelwerk, or null if they have
 * not. The timestamp rather than a boolean: it costs nothing, it is what the
 * rules page shows back so a player can see they are done, and every caller
 * that only needs „has accepted" gets it from the same read.
 */
export async function acceptedAt(
  windowId: string,
  userId: string,
): Promise<Date | null> {
  const row = await db.query.regelwerkAcceptances.findFirst({
    columns: { acceptedAt: true },
    where: and(
      eq(regelwerkAcceptances.windowId, windowId),
      eq(regelwerkAcceptances.userId, userId),
    ),
  });
  return row?.acceptedAt ?? null;
}

/**
 * Records acceptance, returning the stored timestamp. Idempotent via the
 * (window, user) unique constraint — a double submit keeps the original
 * timestamp rather than moving it forward.
 */
export async function recordAcceptance(
  windowId: string,
  userId: string,
): Promise<Date> {
  const [row] = await db
    .insert(regelwerkAcceptances)
    .values({ windowId, userId })
    .onConflictDoNothing()
    .returning({ acceptedAt: regelwerkAcceptances.acceptedAt });

  // No row back means the conflict fired: someone already accepted, and that
  // first timestamp is the one that counts.
  return row?.acceptedAt ?? ((await acceptedAt(windowId, userId)) as Date);
}

/**
 * Removes an acceptance. Two callers: `withdraw`, because an acceptance given
 * as part of registering should not outlive the registration, and
 * `/dev/regelwerk?accept=0`, which exists because the product otherwise has no
 * un-accept and the prompts would be reachable once per season.
 */
export async function clearAcceptance(
  windowId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(regelwerkAcceptances)
    .where(
      and(
        eq(regelwerkAcceptances.windowId, windowId),
        eq(regelwerkAcceptances.userId, userId),
      ),
    );
}
