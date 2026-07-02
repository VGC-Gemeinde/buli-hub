import { and, asc, eq, gt } from "drizzle-orm";
import { divisions, seedings } from "@/db/schema";
import { db } from "@/lib/db";

export async function getSeeding(windowId: string) {
  return (
    (await db.query.seedings.findFirst({
      where: eq(seedings.windowId, windowId),
    })) ?? null
  );
}

export async function listDivisions(windowId: string) {
  return db
    .select()
    .from(divisions)
    .where(eq(divisions.windowId, windowId))
    .orderBy(asc(divisions.tier));
}

// Persists the seeding config and reconciles the division rows to exactly
// `divisionCount` tiers (1..N): creates the missing tiers and removes any
// above N (their sub-divisions cascade; placements are set null).
export async function saveSeedingConfig(
  windowId: string,
  subDivisionSize: number,
  divisionCount: number,
) {
  await db.transaction(async (tx) => {
    const now = new Date();
    await tx
      .insert(seedings)
      .values({ windowId, subDivisionSize, updatedAt: now })
      .onConflictDoUpdate({
        target: seedings.windowId,
        set: { subDivisionSize, updatedAt: now },
      });

    const existing = await tx
      .select({ tier: divisions.tier })
      .from(divisions)
      .where(eq(divisions.windowId, windowId));
    const existingTiers = new Set(existing.map((row) => row.tier));

    const toCreate = [];
    for (let tier = 1; tier <= divisionCount; tier++) {
      if (!existingTiers.has(tier)) {
        toCreate.push({ windowId, tier });
      }
    }
    if (toCreate.length > 0) {
      await tx.insert(divisions).values(toCreate);
    }

    await tx
      .delete(divisions)
      .where(
        and(
          eq(divisions.windowId, windowId),
          gt(divisions.tier, divisionCount),
        ),
      );
  });
}
