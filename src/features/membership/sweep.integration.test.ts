import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
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
import { profiles, registrations, registrationWindows } from "@/db/schema";
import { db } from "@/lib/db";

// The sweep compares the registered roster against the guild members list in
// one call and writes the result in one upsert. This file proves who gets
// written, that an API error writes nothing, and that unregistered players
// stay untouched.

const { fetchGuildMemberIdsMock } = vi.hoisted(() => ({
  fetchGuildMemberIdsMock: vi.fn(),
}));
vi.mock("@/lib/discord", () => ({
  fetchGuildMemberIds: fetchGuildMemberIdsMock,
}));

const { sweepGuildMemberships } = await import("./sweep");
const { registeredMembership } = await import("./queries");

const staff = randomUUID();
const memberUser = randomUUID();
const goneUser = randomUUID();
const noDiscordUser = randomUUID();
const users = [staff, memberUser, goneUser, noDiscordUser];
// Distinct snowflakes so the list mock can answer per player.
const snowflake: Record<string, string> = {
  [staff]: "200000000000000009",
  [memberUser]: "200000000000000001",
  [goneUser]: "200000000000000002",
};
let windowId: string;

beforeAll(async () => {
  await db.delete(registrationWindows);
  for (const id of users) {
    await db.execute(
      sql`insert into auth.users (id, raw_user_meta_data)
          values (${id}, ${JSON.stringify(
            snowflake[id] ? { provider_id: snowflake[id] } : {},
          )}::jsonb)`,
    );
  }
  const [window] = await db
    .insert(registrationWindows)
    .values({
      closesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      openedBy: staff,
      seasonNumber: 9,
    })
    .returning({ id: registrationWindows.id });
  windowId = window.id;
  await db.insert(registrations).values(
    [memberUser, goneUser, noDiscordUser].map((userId) => ({
      windowId,
      userId,
      platform: "showdown" as const,
      status: "returning" as const,
    })),
  );
});

beforeEach(() => {
  vi.stubEnv("DISCORD_GUILD_ID", "guild");
  vi.stubEnv("DISCORD_ROLE_ID_DEV", "role-dev");
  vi.stubEnv("DISCORD_ROLE_ID_ADMIN", "role-admin");
  vi.stubEnv("DISCORD_ROLE_ID_STAFF", "role-staff");
});

afterEach(async () => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  await db.delete(profiles).where(inArray(profiles.userId, users));
});

afterAll(async () => {
  await db.delete(registrationWindows);
  for (const id of users) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("sweepGuildMemberships", () => {
  it("does nothing without Discord config", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("DISCORD_GUILD_ID", "");

    await sweepGuildMemberships(windowId);

    expect(fetchGuildMemberIdsMock).not.toHaveBeenCalled();
    const roster = await registeredMembership(windowId);
    expect(roster.every((row) => row.guildMember === null)).toBe(true);
  });

  it("writes the roster from one members list", async () => {
    fetchGuildMemberIdsMock.mockResolvedValue(
      new Set([snowflake[memberUser], "999999999999999999"]),
    );

    await sweepGuildMemberships(windowId);

    expect(fetchGuildMemberIdsMock).toHaveBeenCalledTimes(1);
    expect(fetchGuildMemberIdsMock).toHaveBeenCalledWith("guild");
    const roster = await registeredMembership(windowId);
    const byUser = new Map(roster.map((row) => [row.userId, row.guildMember]));
    expect(byUser.get(memberUser)).toBe(true);
    // In the roster but not in the list: confirmed gone.
    expect(byUser.get(goneUser)).toBe(false);
    // No Discord id: cannot appear in the list, stays never checked — no
    // profile row is created at all.
    expect(byUser.get(noDiscordUser)).toBeNull();
  });

  it("overwrites a stored state with the fresh one", async () => {
    await db
      .insert(profiles)
      .values({ userId: memberUser, guildMember: false });
    fetchGuildMemberIdsMock.mockResolvedValue(new Set([snowflake[memberUser]]));

    await sweepGuildMemberships(windowId);

    const roster = await registeredMembership(windowId);
    expect(roster.find((row) => row.userId === memberUser)?.guildMember).toBe(
      true,
    );
  });

  it("writes nothing when the list call fails", async () => {
    await db.insert(profiles).values({
      userId: memberUser,
      guildMember: true,
      guildMemberCheckedAt: new Date("2026-08-20T10:00:00Z"),
    });
    fetchGuildMemberIdsMock.mockRejectedValue(new Error("Discord API 403"));

    await sweepGuildMemberships(windowId);

    const roster = await registeredMembership(windowId);
    const memberRow = roster.find((row) => row.userId === memberUser);
    expect(memberRow?.guildMember).toBe(true);
    expect(memberRow?.guildMemberCheckedAt).toEqual(
      new Date("2026-08-20T10:00:00Z"),
    );
    expect(
      roster.find((row) => row.userId === goneUser)?.guildMember,
    ).toBeNull();
  });

  it("leaves unregistered players out of the write", async () => {
    // The staff member is not registered; even as a guild member the sweep
    // must not create a profile row for them.
    fetchGuildMemberIdsMock.mockResolvedValue(new Set([snowflake[staff]]));

    await sweepGuildMemberships(windowId);

    const stored = await db.query.profiles.findFirst({
      where: (table, { eq }) => eq(table.userId, staff),
    });
    expect(stored).toBeUndefined();
  });
});
