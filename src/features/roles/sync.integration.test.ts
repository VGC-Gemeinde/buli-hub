import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { profiles } from "@/db/schema";
import type { DiscordIdentity } from "@/features/auth/identity";
import { db } from "@/lib/db";

// The membership write rules: the guild_member tri-state may only ever be
// written by a lookup that actually ran. A confirmed 404 is the single path to
// false; everything that merely failed to check leaves the stored value alone.

const { fetchGuildMemberMock } = vi.hoisted(() => ({
  fetchGuildMemberMock: vi.fn(),
}));
vi.mock("@/lib/discord", () => ({
  fetchGuildMember: fetchGuildMemberMock,
  memberAvatarUrl: () => null,
}));

const { getRole, syncMember } = await import("./sync");

const userId = randomUUID();

const identity: DiscordIdentity = {
  discordId: "100000000000000099",
  displayName: "Testnutzer",
  username: "test",
  avatarUrl: null,
};

const member = {
  roles: [],
  nick: null,
  avatar: null,
  user: {
    id: identity.discordId as string,
    username: "test",
    globalName: "Testnutzer",
    avatar: null,
  },
};

function configureDiscordEnv() {
  vi.stubEnv("DISCORD_GUILD_ID", "guild");
  vi.stubEnv("DISCORD_ROLE_ID_DEV", "role-dev");
  vi.stubEnv("DISCORD_ROLE_ID_ADMIN", "role-admin");
  vi.stubEnv("DISCORD_ROLE_ID_STAFF", "role-staff");
}

async function storedProfile() {
  return await db.query.profiles.findFirst({
    columns: {
      role: true,
      roleSyncedAt: true,
      guildMember: true,
      guildMemberCheckedAt: true,
    },
    where: eq(profiles.userId, userId),
  });
}

beforeAll(async () => {
  await db.execute(sql`insert into auth.users (id) values (${userId})`);
});

beforeEach(() => {
  configureDiscordEnv();
});

afterEach(async () => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  await db.delete(profiles).where(eq(profiles.userId, userId));
});

afterAll(async () => {
  await db.execute(sql`delete from auth.users where id = ${userId}`);
});

describe("syncMember membership write rules", () => {
  it("stores true when the member is found", async () => {
    fetchGuildMemberMock.mockResolvedValue(member);

    await syncMember(userId, identity);

    const stored = await storedProfile();
    expect(stored?.guildMember).toBe(true);
    expect(stored?.guildMemberCheckedAt).not.toBeNull();
  });

  it("stores false on a confirmed 404, overwriting a previous true", async () => {
    fetchGuildMemberMock.mockResolvedValue(member);
    await syncMember(userId, identity);

    fetchGuildMemberMock.mockResolvedValue(null);
    await syncMember(userId, identity);

    const stored = await storedProfile();
    expect(stored?.guildMember).toBe(false);
    expect(stored?.role).toBe("player");
  });

  it("leaves everything untouched when the lookup throws", async () => {
    fetchGuildMemberMock.mockResolvedValue(null);
    await syncMember(userId, identity);
    const before = await storedProfile();

    fetchGuildMemberMock.mockRejectedValue(new Error("Discord API 500"));
    await expect(syncMember(userId, identity)).rejects.toThrow();

    // A stored false in particular must survive: an outage is not a rejoin.
    expect(await storedProfile()).toEqual(before);
  });

  it("writes the role but not the membership without a discordId", async () => {
    await syncMember(userId, { ...identity, discordId: null });

    const stored = await storedProfile();
    expect(stored?.role).toBe("player");
    expect(stored?.roleSyncedAt).not.toBeNull();
    expect(stored?.guildMember).toBeNull();
    expect(stored?.guildMemberCheckedAt).toBeNull();
    expect(fetchGuildMemberMock).not.toHaveBeenCalled();
  });

  it("writes nothing without role config", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("DISCORD_GUILD_ID", "");

    await syncMember(userId, identity);

    expect(await storedProfile()).toBeUndefined();
    expect(fetchGuildMemberMock).not.toHaveBeenCalled();
  });
});

describe("getRole fallback", () => {
  it("keeps the stored membership when the re-sync fails", async () => {
    fetchGuildMemberMock.mockResolvedValue(null);
    await syncMember(userId, identity);
    // Age the sync past the TTL so getRole must attempt a re-sync.
    await db
      .update(profiles)
      .set({ roleSyncedAt: new Date(Date.now() - 60 * 60 * 1000) })
      .where(eq(profiles.userId, userId));

    fetchGuildMemberMock.mockRejectedValue(new Error("Discord API 500"));
    const role = await getRole(userId, identity);

    expect(role).toBe("player");
    expect((await storedProfile())?.guildMember).toBe(false);
  });
});
