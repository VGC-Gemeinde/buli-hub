import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  bans,
  divisions,
  placements,
  playerReplacements,
  profiles,
  registrations,
  registrationWindows,
  subDivisions,
} from "@/db/schema";
import { replacementCandidates } from "@/features/replacements/queries";
import { createWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import { banConflictsForUser } from "./conflict-queries";
import {
  banAccount,
  banCandidates,
  bannedUserIds,
  discordIdOfUser,
  hubUserByDiscordId,
  isBanned,
  liftBan,
  listBans,
} from "./queries";

// Hub users with Discord ids in their auth metadata, the way a Discord
// sign-in stores them (provider_id), plus one id nobody in the hub has.
const anton = randomUUID();
const bea = randomUUID();
const staff = randomUUID();
const noDiscord = randomUUID();
const users = [anton, bea, staff, noDiscord];
const discord: Record<string, string> = {
  [anton]: "300000000000000001",
  [bea]: "300000000000000002",
  [staff]: "300000000000000009",
};
const oldTimer = "300000000000000077";
const lateComer = randomUUID();
let windowId: string;

async function insertUser(id: string, discordId?: string) {
  await db.execute(
    sql`insert into auth.users (id, raw_user_meta_data)
        values (${id}, ${JSON.stringify(
          discordId ? { provider_id: discordId } : {},
        )}::jsonb)`,
  );
}

beforeAll(async () => {
  await db.delete(bans);
  await db.delete(registrationWindows);
  for (const id of users) {
    await insertUser(id, discord[id]);
  }
  await db.insert(profiles).values([
    { userId: anton, displayName: "Anton" },
    { userId: bea, displayName: "Bea" },
    { userId: staff, displayName: "Staffi", role: "staff" },
    { userId: noDiscord, displayName: "Persona" },
  ]);
  await createWindow(new Date(Date.now() + 7 * 86_400_000), staff, 9);
  const rows = await db.execute<{ id: string }>(
    sql`select id from registration_windows where opened_by = ${staff}`,
  );
  windowId = rows[0].id;
});

afterAll(async () => {
  await db.delete(bans);
  await db.delete(registrationWindows);
  for (const id of [...users, lateComer]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("ban lifecycle", () => {
  it("bans, blocks, lifts and keeps the history", async () => {
    expect(await isBanned(discord[anton])).toBe(false);
    await banAccount({
      discordId: discord[anton],
      discordName: "Anton",
      reason: "Mehrfach nicht angetreten",
      bannedById: staff,
    });
    expect(await isBanned(discord[anton])).toBe(true);
    expect(await isBanned(discord[bea])).toBe(false);
    expect(await isBanned(null)).toBe(false);

    const [active] = await listBans();
    expect(active).toMatchObject({
      discordId: discord[anton],
      person: { userId: anton, name: "Anton" },
      inHub: true,
      reason: "Mehrfach nicht angetreten",
      bannedByName: "Staffi",
      liftedAt: null,
    });

    expect(await liftBan(active.id, staff)).toBe(true);
    expect(await liftBan(active.id, staff)).toBe(false);
    expect(await isBanned(discord[anton])).toBe(false);
    const [lifted] = await listBans();
    expect(lifted.liftedAt).not.toBeNull();
    expect(lifted.liftedByName).toBe("Staffi");
  });

  it("allows one active ban per account, any number in the history", async () => {
    await banAccount({
      discordId: discord[anton],
      discordName: "Anton",
      reason: "Wieder",
      bannedById: staff,
    });
    await expect(
      banAccount({
        discordId: discord[anton],
        discordName: "Anton",
        reason: "Doppelt",
        bannedById: staff,
      }),
    ).rejects.toThrow();
    expect(await listBans()).toHaveLength(2);
  });

  it("refuses something that is not a Discord id", async () => {
    await expect(
      banAccount({
        discordId: "anton",
        discordName: null,
        reason: "Kaputt",
        bannedById: staff,
      }),
    ).rejects.toThrow();
  });
});

describe("bans by Discord-ID", () => {
  it("shows an id-only ban by its snapshot, then by the hub user once they sign in", async () => {
    await banAccount({
      discordId: oldTimer,
      discordName: "Altmeister",
      reason: "Aus Saison 3",
      bannedById: staff,
    });
    const before = (await listBans()).find((b) => b.discordId === oldTimer);
    expect(before).toMatchObject({
      inHub: false,
      person: { name: "Altmeister" },
    });
    expect(await hubUserByDiscordId(oldTimer)).toBeNull();

    // The person signs in for the first time.
    await insertUser(lateComer, oldTimer);
    await db.insert(profiles).values({ userId: lateComer, displayName: "Neu" });

    expect(await isBanned(await discordIdOfUser(lateComer))).toBe(true);
    const after = (await listBans()).find((b) => b.discordId === oldTimer);
    expect(after).toMatchObject({
      inHub: true,
      person: { userId: lateComer, name: "Neu" },
    });
    expect(await hubUserByDiscordId(oldTimer)).toMatchObject({
      userId: lateComer,
    });
    expect(await bannedUserIds()).toContain(lateComer);
  });
});

describe("who can be picked", () => {
  it("leaves banned accounts and accounts without a Discord id out", async () => {
    const ids = (await banCandidates()).map((c) => c.userId);
    expect(ids).toContain(bea);
    expect(ids).toContain(staff);
    expect(ids).not.toContain(anton);
    expect(ids).not.toContain(noDiscord);
    expect(ids).not.toContain(lateComer);
  });

  it("never offers a banned player as a replacement", async () => {
    const ids = (await replacementCandidates(windowId)).map((c) => c.userId);
    expect(ids).toContain(bea);
    expect(ids).not.toContain(anton);
  });
});

describe("conflicts in the current season", () => {
  it("names a registration in the open window", async () => {
    await db.insert(registrations).values({
      windowId,
      userId: bea,
      platform: "showdown",
      status: "new",
    });
    expect(await banConflictsForUser(bea)).toEqual([
      expect.objectContaining({
        kind: "registration",
        href: `/spieler/${bea}`,
      }),
    ]);
    expect(await banConflictsForUser(anton)).toEqual([]);
  });

  it("names an open replacement offer", async () => {
    // A placed, dropped player whose slot is offered to Anton.
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
      userId: bea,
      divisionId: division.id,
      subDivisionId: sub.id,
      droppedAt: new Date(),
    });
    await db.insert(playerReplacements).values({
      windowId,
      replacedUserId: bea,
      replacementUserId: anton,
      entryRound: 1,
    });
    expect(await banConflictsForUser(anton)).toEqual([
      expect.objectContaining({ kind: "offer", href: `/spieler/${bea}` }),
    ]);
  });
});
