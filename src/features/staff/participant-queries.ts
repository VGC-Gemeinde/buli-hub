import { and, eq } from "drizzle-orm";
import {
  divisions,
  placements,
  profiles,
  registrations,
  subDivisions,
} from "@/db/schema";
import type { Identity } from "@/features/season/dashboard";
import { subDivisionName } from "@/features/seeding/seeding";
import { db } from "@/lib/db";
import { PLAYER_NAME_FALLBACK, playerName } from "@/lib/player-name";

// Everyone registered in a window with what the Teilnehmer page shows: the
// identity, the group once placed, the membership state and the drop.
export type ParticipantRow = {
  identity: Identity;
  username: string | null;
  groupName: string | null;
  guildMember: boolean | null;
  guildMemberCheckedAt: Date | null;
  dropped: boolean;
  dropReason: string | null;
};

export async function seasonParticipants(
  windowId: string,
): Promise<ParticipantRow[]> {
  const rows = await db
    .select({
      userId: registrations.userId,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
      guildMember: profiles.guildMember,
      guildMemberCheckedAt: profiles.guildMemberCheckedAt,
      tier: divisions.tier,
      position: subDivisions.position,
      droppedAt: placements.droppedAt,
      dropReason: placements.dropReason,
    })
    .from(registrations)
    .leftJoin(profiles, eq(profiles.userId, registrations.userId))
    .leftJoin(
      placements,
      and(
        eq(placements.windowId, registrations.windowId),
        eq(placements.userId, registrations.userId),
      ),
    )
    .leftJoin(subDivisions, eq(subDivisions.id, placements.subDivisionId))
    .leftJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .where(eq(registrations.windowId, windowId));
  return rows
    .map((row) => ({
      identity: {
        userId: row.userId,
        name: playerName(row.displayName, row.username) || PLAYER_NAME_FALLBACK,
        avatarUrl: row.avatarUrl ?? null,
      },
      username: row.username,
      groupName:
        row.tier !== null && row.position !== null
          ? subDivisionName(row.tier, row.position)
          : null,
      guildMember: row.guildMember,
      guildMemberCheckedAt: row.guildMemberCheckedAt,
      dropped: row.droppedAt !== null,
      dropReason: row.dropReason,
    }))
    .sort((a, b) => a.identity.name.localeCompare(b.identity.name, "de"));
}
