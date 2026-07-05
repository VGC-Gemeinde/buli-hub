import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { discordPosts, divisions, matches, subDivisions } from "@/db/schema";
import { createWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import { deletePostRow, getPost, upsertPost } from "./queries";

const alice = randomUUID();
const bob = randomUUID();
let windowId: string;
let matchId: string;

beforeAll(async () => {
  for (const id of [alice, bob]) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }
  await createWindow(new Date("2026-06-30T18:00:00Z"), alice, 1);
  const rows = await db.execute<{ id: string }>(
    sql`select id from registration_windows where opened_by = ${alice}`,
  );
  windowId = rows[0].id;

  const [division] = await db
    .insert(divisions)
    .values({ windowId, tier: 1 })
    .returning({ id: divisions.id });
  const [subDivision] = await db
    .insert(subDivisions)
    .values({ divisionId: division.id, position: 0 })
    .returning({ id: subDivisions.id });
  const [match] = await db
    .insert(matches)
    .values({
      subDivisionId: subDivision.id,
      round: 1,
      playerAId: alice,
      playerBId: bob,
    })
    .returning({ id: matches.id });
  matchId = match.id;
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  for (const id of [alice, bob]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("discord post rows", () => {
  it("round-trips a post and re-points it on upsert", async () => {
    await upsertPost({
      kind: "result",
      matchId,
      channelId: "c1",
      messageId: "m1",
    });
    expect(await getPost("result", matchId)).toEqual({
      channelId: "c1",
      messageId: "m1",
    });
    // Self-healing re-post targets the freshly configured channel.
    await upsertPost({
      kind: "result",
      matchId,
      channelId: "c2",
      messageId: "m2",
    });
    expect(await getPost("result", matchId)).toEqual({
      channelId: "c2",
      messageId: "m2",
    });
  });

  it("keeps kinds independent per match", async () => {
    await upsertPost({
      kind: "motw_vod",
      matchId,
      channelId: "c1",
      messageId: "vod1",
    });
    expect((await getPost("result", matchId))?.messageId).toBe("m2");
    expect((await getPost("motw_vod", matchId))?.messageId).toBe("vod1");
  });

  it("enforces one row per kind and match at the DB level", async () => {
    await expect(
      db.insert(discordPosts).values({
        kind: "result",
        matchId,
        channelId: "c3",
        messageId: "m3",
      }),
    ).rejects.toThrow();
  });

  it("deletes a row (and reports nothing thereafter)", async () => {
    await deletePostRow("result", matchId);
    expect(await getPost("result", matchId)).toBeNull();
    expect(await getPost("motw_vod", matchId)).not.toBeNull();
  });
});
