import { and, eq, isNull, sql } from "drizzle-orm";
import { bans } from "@/db/schema";
import type { Identity } from "@/features/season/dashboard";
import { db } from "@/lib/db";
import { PLAYER_NAME_FALLBACK, playerName } from "@/lib/player-name";

// A hub user's Discord id, read from the auth metadata exactly as
// `discordIdentityFromUser` reads it (provider_id, else sub). Raw SQL because
// Drizzle does not manage the auth schema.
const userDiscordId = sql.raw(
  "coalesce(nullif(u.raw_user_meta_data->>'provider_id', ''), nullif(u.raw_user_meta_data->>'sub', ''))",
);

/** Whether a Discord account is banned right now. No id = never banned. */
export async function isBanned(discordId: string | null): Promise<boolean> {
  if (!discordId) {
    return false;
  }
  const row = await db.query.bans.findFirst({
    columns: { id: true },
    where: and(eq(bans.discordId, discordId), isNull(bans.liftedAt)),
  });
  return row !== undefined;
}

export async function banAccount(input: {
  discordId: string;
  discordName: string | null;
  reason: string;
  bannedById: string;
}): Promise<void> {
  await db.insert(bans).values(input);
}

// Lifts an active ban; false when it was not active (already lifted, gone).
export async function liftBan(
  banId: string,
  liftedById: string,
): Promise<boolean> {
  const lifted = await db
    .update(bans)
    .set({ liftedAt: new Date(), liftedById })
    .where(and(eq(bans.id, banId), isNull(bans.liftedAt)))
    .returning({ id: bans.id });
  return lifted.length > 0;
}

// One ban as the Banliste shows it. `person` is the hub user with this
// Discord id if there is one (resolved at read time, so an id-only ban shows
// the person once they sign in); otherwise the name snapshot or the id.
export type BanRow = {
  id: string;
  discordId: string;
  person: Identity;
  inHub: boolean;
  reason: string;
  bannedAt: Date;
  bannedByName: string | null;
  liftedAt: Date | null;
  liftedByName: string | null;
};

export async function listBans(): Promise<BanRow[]> {
  const rows = await db.execute<{
    id: string;
    discord_id: string;
    discord_name: string | null;
    reason: string;
    banned_at: Date | string;
    lifted_at: Date | string | null;
    user_id: string | null;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    banned_by_name: string | null;
    banned_by_username: string | null;
    lifted_by_name: string | null;
    lifted_by_username: string | null;
  }>(sql`
    select b.id, b.discord_id, b.discord_name, b.reason, b.banned_at,
           b.lifted_at, hub.user_id, hub.display_name, hub.username,
           hub.avatar_url,
           bb.display_name as banned_by_name, bb.username as banned_by_username,
           lb.display_name as lifted_by_name, lb.username as lifted_by_username
    from bans b
    left join lateral (
      select p.user_id, p.display_name, p.username, p.avatar_url
      from auth.users u
      join profiles p on p.user_id = u.id
      where ${userDiscordId} = b.discord_id
      limit 1
    ) hub on true
    left join profiles bb on bb.user_id = b.banned_by_id
    left join profiles lb on lb.user_id = b.lifted_by_id
    order by b.lifted_at is not null, coalesce(b.lifted_at, b.banned_at) desc
  `);
  const date = (value: Date | string) =>
    value instanceof Date ? value : new Date(value);
  return rows.map((row) => ({
    id: row.id,
    discordId: row.discord_id,
    person: {
      userId: row.user_id ?? row.discord_id,
      name: row.user_id
        ? playerName(row.display_name, row.username) || PLAYER_NAME_FALLBACK
        : (row.discord_name ?? row.discord_id),
      avatarUrl: row.avatar_url ?? null,
    },
    inHub: row.user_id !== null,
    reason: row.reason,
    bannedAt: date(row.banned_at),
    bannedByName:
      row.banned_by_name || row.banned_by_username
        ? playerName(row.banned_by_name, row.banned_by_username)
        : null,
    liftedAt: row.lifted_at === null ? null : date(row.lifted_at),
    liftedByName:
      row.lifted_by_name || row.lifted_by_username
        ? playerName(row.lifted_by_name, row.lifted_by_username)
        : null,
  }));
}

// Everyone staff can ban by picking: every hub user with a Discord id and no
// active ban, sorted by name.
export type BanCandidate = Identity & {
  username: string | null;
  discordId: string;
};

export async function banCandidates(): Promise<BanCandidate[]> {
  const rows = await db.execute<{
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    discord_id: string;
  }>(sql`
    select p.user_id, p.display_name, p.username, p.avatar_url,
           ${userDiscordId} as discord_id
    from profiles p
    join auth.users u on u.id = p.user_id
    where ${userDiscordId} is not null
      and not exists (
        select 1 from bans b
        where b.discord_id = ${userDiscordId} and b.lifted_at is null
      )
  `);
  return rows
    .map((row) => ({
      userId: row.user_id,
      name: playerName(row.display_name, row.username) || PLAYER_NAME_FALLBACK,
      username: row.username,
      avatarUrl: row.avatar_url ?? null,
      discordId: row.discord_id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

// The hub user behind a Discord id, if anyone with it has signed in.
export async function hubUserByDiscordId(
  discordId: string,
): Promise<BanCandidate | null> {
  const rows = await db.execute<{
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }>(sql`
    select p.user_id, p.display_name, p.username, p.avatar_url
    from auth.users u
    join profiles p on p.user_id = u.id
    where ${userDiscordId} = ${discordId}
    limit 1
  `);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    userId: row.user_id,
    name: playerName(row.display_name, row.username) || PLAYER_NAME_FALLBACK,
    username: row.username,
    avatarUrl: row.avatar_url ?? null,
    discordId,
  };
}

// The hub users whose Discord account is banned right now — what the
// replacement candidates are filtered by.
export async function bannedUserIds(): Promise<Set<string>> {
  const rows = await db.execute<{ user_id: string }>(sql`
    select u.id as user_id
    from auth.users u
    join bans b on b.discord_id = ${userDiscordId} and b.lifted_at is null
  `);
  return new Set(rows.map((row) => row.user_id));
}

// The Discord id of a hub user, or null (only dev personas have none).
export async function discordIdOfUser(userId: string): Promise<string | null> {
  const rows = await db.execute<{ discord_id: string | null }>(sql`
    select ${userDiscordId} as discord_id from auth.users u where u.id = ${userId}
  `);
  return rows[0]?.discord_id ?? null;
}
