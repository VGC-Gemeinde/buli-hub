import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { findOrCreateUserByDiscordId } from "./users";

const discordIds = ["400000000000000001", "400000000000000002"];

afterAll(async () => {
  await db.execute(
    sql`delete from users where discord_id in (${sql.join(
      discordIds.map((id) => sql`${id}`),
      sql`, `,
    )})`,
  );
});

describe("findOrCreateUserByDiscordId", () => {
  it("creates an account on the first sign-in and finds it afterwards", async () => {
    const first = await findOrCreateUserByDiscordId(discordIds[0]);
    const again = await findOrCreateUserByDiscordId(discordIds[0]);
    expect(again).toBe(first);
    const rows = await db.execute<{ discord_id: string }>(
      sql`select discord_id from users where id = ${first}`,
    );
    expect(rows[0]?.discord_id).toBe(discordIds[0]);
  });

  it("keeps a migrated account's id", async () => {
    const migrated = randomUUID();
    await db.execute(
      sql`insert into users (id, discord_id) values (${migrated}, ${discordIds[1]})`,
    );
    expect(await findOrCreateUserByDiscordId(discordIds[1])).toBe(migrated);
  });

  it("creates one row when two sign-ins race for a new Discord id", async () => {
    const racer = "400000000000000003";
    discordIds.push(racer);
    const [a, b] = await Promise.all([
      findOrCreateUserByDiscordId(racer),
      findOrCreateUserByDiscordId(racer),
    ]);
    expect(a).toBe(b);
    const rows = await db.execute(
      sql`select id from users where discord_id = ${racer}`,
    );
    expect(rows.length).toBe(1);
  });
});
