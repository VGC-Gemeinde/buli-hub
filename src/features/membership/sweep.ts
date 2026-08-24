import { sql } from "drizzle-orm";
import { profiles } from "@/db/schema";
import { roleConfig } from "@/features/roles/config";
import { db } from "@/lib/db";
import { fetchGuildMemberIds } from "@/lib/discord";
import { listRegisteredIdentities } from "./queries";

// Re-checks guild membership for every player registered in a window, from a
// single guild-members list call (one or two pages at league scale). Runs on
// every load of the staff overview — cheap enough that no TTL or manual
// trigger is needed — and is what backfills the flag for players who
// registered before membership was tracked.
//
// The one write path besides the per-user `syncMember`, with the same rules:
// only a completed lookup writes, and it closes only on confirmed absence.
// The whole list is fetched before anything is written, and any API error
// (notably the 403 of a bot without the Server Members Intent) aborts the
// sweep without a write — a partial page can never flag the league as gone.
// Players without a Discord id cannot appear in the list and stay untouched,
// visible as never checked.
export async function sweepGuildMemberships(windowId: string): Promise<void> {
  const config = roleConfig();
  if (!config) {
    // Local dev without Discord env: the overview renders stored flags.
    return;
  }
  const identities = (await listRegisteredIdentities(windowId)).filter(
    (row): row is typeof row & { identity: { discordId: string } } =>
      row.identity.discordId !== null,
  );
  if (identities.length === 0) {
    return;
  }

  let memberIds: Set<string>;
  try {
    memberIds = await fetchGuildMemberIds(config.guildId);
  } catch {
    // Fail open: outage or misconfiguration must never mass-flag the roster.
    return;
  }

  const checkedAt = new Date();
  await db
    .insert(profiles)
    .values(
      identities.map(({ userId, identity }) => ({
        userId,
        guildMember: memberIds.has(identity.discordId),
        guildMemberCheckedAt: checkedAt,
      })),
    )
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        guildMember: sql`excluded.guild_member`,
        guildMemberCheckedAt: sql`excluded.guild_member_checked_at`,
      },
    });
}
