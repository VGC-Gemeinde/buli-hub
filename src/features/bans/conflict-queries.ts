import { and, eq } from "drizzle-orm";
import { placements } from "@/db/schema";
import { getRegistration } from "@/features/registration/queries";
import { pendingOfferFor } from "@/features/replacements/queries";
import { latestWindow, windowSeasonPhase } from "@/features/staff/queries";
import { seasonName } from "@/features/staff/registration-window";
import { db } from "@/lib/db";
import { type BanConflict, banConflicts } from "./bans";

// What banning a hub user would leave as it is in the latest season: read
// here, decided by the pure `banConflicts`. Separate from queries.ts because
// it reads replacements, which in turn filter by bans.
export async function banConflictsForUser(
  userId: string,
): Promise<BanConflict[]> {
  const window = await latestWindow();
  if (!window) {
    return [];
  }
  const [{ phase }, registration, placement, offer] = await Promise.all([
    windowSeasonPhase(window),
    getRegistration(window.id, userId),
    db.query.placements.findFirst({
      columns: { subDivisionId: true, droppedAt: true },
      where: and(
        eq(placements.windowId, window.id),
        eq(placements.userId, userId),
      ),
    }),
    pendingOfferFor(window.id, userId),
  ]);
  return banConflicts({
    userId,
    seasonName: seasonName(window.seasonNumber),
    phase,
    registered: registration !== null,
    playing:
      placement !== undefined &&
      placement.subDivisionId !== null &&
      placement.droppedAt === null,
    pendingOfferFor: offer
      ? { userId: offer.replaced.userId, name: offer.replaced.name }
      : null,
  });
}
