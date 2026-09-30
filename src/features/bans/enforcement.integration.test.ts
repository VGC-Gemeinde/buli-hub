import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  bans,
  divisions,
  placements,
  playerReplacements,
  registrationWindows,
  subDivisions,
} from "@/db/schema";
import { db } from "@/lib/db";
import { BAN_ERROR } from "./bans";

// A ban is only worth anything if the ways into a season actually ask for it.
// The pure refusal is covered in bans.test.ts; this file proves the wiring:
// registering and taking over a slot both refuse a banned account, and
// lifting the ban lets the same call through the ban check again.

const { currentUserMock, currentSeasonMock } = vi.hoisted(() => ({
  currentUserMock: vi.fn(),
  currentSeasonMock: vi.fn(),
}));
vi.mock("@/features/roles/guard", () => ({ currentUser: currentUserMock }));
vi.mock("@/features/season/season-status", () => ({
  currentSeason: currentSeasonMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { register } = await import("@/features/registration/actions");
const { acceptReplacement } = await import("@/features/replacements/actions");

const player = randomUUID();
const dropped = randomUUID();
const discordId = "310000000000000001";
let windowId: string;

beforeAll(async () => {
  for (const id of [player, dropped]) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }
  await db.delete(bans);
  await db.delete(registrationWindows);
  const [window] = await db
    .insert(registrationWindows)
    .values({
      closesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      openedBy: player,
      seasonNumber: 9,
    })
    .returning({ id: registrationWindows.id });
  windowId = window.id;
  currentUserMock.mockResolvedValue({
    userId: player,
    discordId,
    role: "player",
    displayName: "Gesperrt",
    username: "gesperrt",
    avatarUrl: null,
    guildMember: true,
  });
  await db.insert(bans).values({ discordId, reason: "Test" });
});

afterAll(async () => {
  await db.delete(bans);
  await db.delete(registrationWindows);
  for (const id of [player, dropped]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("register", () => {
  it("refuses a banned account", async () => {
    expect(await register({})).toEqual({ ok: false, error: BAN_ERROR });
  });
});

describe("acceptReplacement", () => {
  it("refuses a banned account even with an open offer", async () => {
    currentSeasonMock.mockResolvedValue({
      window: { id: windowId, seasonNumber: 9 },
      phase: "regular_season",
    });
    const [division] = await db
      .insert(divisions)
      .values({ windowId, tier: 1 })
      .returning({ id: divisions.id });
    const [sub] = await db
      .insert(subDivisions)
      .values({ divisionId: division.id, position: 0 })
      .returning({ id: subDivisions.id });
    await db.insert(placements).values({
      windowId,
      userId: dropped,
      divisionId: division.id,
      subDivisionId: sub.id,
      droppedAt: new Date(),
    });
    await db.insert(playerReplacements).values({
      windowId,
      replacedUserId: dropped,
      replacementUserId: player,
      entryRound: 1,
    });

    expect(await acceptReplacement({})).toEqual({
      ok: false,
      error: BAN_ERROR,
    });
  });
});

describe("after the ban is lifted", () => {
  it("lets the registration past the ban check", async () => {
    await db
      .update(bans)
      .set({ liftedAt: new Date() })
      .where(sql`${bans.discordId} = ${discordId}`);

    const result = await register({});
    // Still rejected (the payload is garbage), but no longer for the ban.
    expect(result.ok).toBe(false);
    expect(result).not.toEqual({ ok: false, error: BAN_ERROR });
  });
});
