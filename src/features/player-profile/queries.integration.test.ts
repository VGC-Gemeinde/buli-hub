import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { profiles } from "@/db/schema";
import { db } from "@/lib/db";
import { profileIdentity } from "./queries";

const alice = randomUUID();

beforeAll(async () => {
  await db.execute(sql`insert into auth.users (id) values (${alice})`);
  await db.insert(profiles).values({
    userId: alice,
    displayName: "Alice",
    username: "alice_vgc",
    role: "player",
  });
});

afterAll(async () => {
  await db.execute(sql`delete from auth.users where id = ${alice}`);
});

describe("profileIdentity", () => {
  it("returns the public identity of an existing profile", async () => {
    expect(await profileIdentity(alice)).toEqual({
      userId: alice,
      name: "Alice",
      displayName: "Alice",
      username: "alice_vgc",
      avatarUrl: null,
      role: "player",
    });
  });

  it("returns null for an unknown user", async () => {
    expect(await profileIdentity(randomUUID())).toBeNull();
  });
});
