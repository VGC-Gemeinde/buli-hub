import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  placements,
  registrations,
  registrationWindows,
  seedings,
} from "@/db/schema";
import { acceptedAt, recordAcceptance } from "@/features/regelwerk/queries";
import { db } from "@/lib/db";

// The staff cancel: allowed only between Anmeldeschluss and the finalized
// seeding, and it removes everything a registration brought with it — the row
// itself, the Regelwerk acceptance, and a draft placement (which schedule
// generation would otherwise read as a ghost player).

const { currentUserMock } = vi.hoisted(() => ({ currentUserMock: vi.fn() }));
vi.mock("@/features/roles/guard", () => ({ currentUser: currentUserMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { cancelRegistration } = await import("./staff-actions");
const { getRegistration } = await import("./queries");

const staff = randomUUID();
const target = randomUUID();
const bystander = randomUUID();
const users = [staff, target, bystander];

function signedInAs(role: "staff" | "player") {
  currentUserMock.mockResolvedValue({
    userId: staff,
    discordId: "1",
    role,
    displayName: "Staff",
    username: "staff",
    avatarUrl: null,
    guildMember: null,
  });
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function openWindow(closesAt: Date): Promise<string> {
  const [row] = await db
    .insert(registrationWindows)
    .values({ closesAt, openedBy: staff, seasonNumber: 9 })
    .returning({ id: registrationWindows.id });
  return row.id;
}

async function registerPlayers(windowId: string, userIds: string[]) {
  await db.insert(registrations).values(
    userIds.map((userId) => ({
      windowId,
      userId,
      platform: "showdown" as const,
      status: "returning" as const,
    })),
  );
  for (const userId of userIds) {
    await recordAcceptance(windowId, userId);
  }
}

beforeAll(async () => {
  await db.delete(registrationWindows);
  for (const id of users) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }
});

afterEach(async () => {
  vi.clearAllMocks();
  await db.delete(placements);
  await db.delete(seedings);
  await db.delete(registrations);
  await db.delete(registrationWindows);
});

afterAll(async () => {
  for (const id of users) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("cancelRegistration", () => {
  it("refuses a non-staff caller", async () => {
    await openWindow(new Date(Date.now() - WEEK_MS));
    signedInAs("player");

    expect(await cancelRegistration({ userId: target })).toEqual({
      ok: false,
      error: "Keine Berechtigung",
    });
  });

  it("removes registration, acceptance and draft placement after Anmeldeschluss", async () => {
    const windowId = await openWindow(new Date(Date.now() - WEEK_MS));
    await registerPlayers(windowId, [target, bystander]);
    await db.insert(placements).values({ windowId, userId: target });
    signedInAs("staff");

    expect(await cancelRegistration({ userId: target })).toEqual({ ok: true });

    expect(await getRegistration(windowId, target)).toBeNull();
    expect(await acceptedAt(windowId, target)).toBeNull();
    const orphaned = await db
      .select()
      .from(placements)
      .where(
        and(eq(placements.windowId, windowId), eq(placements.userId, target)),
      );
    expect(orphaned).toHaveLength(0);
    // The bystander keeps everything.
    expect(await getRegistration(windowId, bystander)).not.toBeNull();
    expect(await acceptedAt(windowId, bystander)).not.toBeNull();
  });

  it("refuses while the registration window is open", async () => {
    const windowId = await openWindow(new Date(Date.now() + WEEK_MS));
    await registerPlayers(windowId, [target]);
    signedInAs("staff");

    const result = await cancelRegistration({ userId: target });

    expect(result.ok).toBe(false);
    expect(await getRegistration(windowId, target)).not.toBeNull();
  });

  it("refuses once the seeding is finalized and points to the drop flow", async () => {
    const windowId = await openWindow(new Date(Date.now() - WEEK_MS));
    await registerPlayers(windowId, [target]);
    await db.insert(seedings).values({
      windowId,
      subDivisionSize: 6,
      finalizedAt: new Date(),
    });
    signedInAs("staff");

    const result = await cancelRegistration({ userId: target });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Drop");
    }
    expect(await getRegistration(windowId, target)).not.toBeNull();
  });

  it("refuses when the player has no registration", async () => {
    await openWindow(new Date(Date.now() - WEEK_MS));
    signedInAs("staff");

    expect(await cancelRegistration({ userId: target })).toEqual({
      ok: false,
      error: "Für diesen Spieler liegt keine Anmeldung vor.",
    });
  });
});
