import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { registrationWindows } from "@/db/schema";
import { LOCKED_ERROR } from "@/features/regelwerk/acceptance";
import { db } from "@/lib/db";
import { MEMBERSHIP_ERROR } from "./membership";

// The membership lock is only worth anything if the actions actually call it.
// The pure decision is covered in membership.test.ts; what this file proves is
// the wiring: a confirmed non-member is refused before the action does any
// work, an unknown state fails open, and the membership refusal comes before
// the Regelwerk one (matching the season gate's precedence).

const { currentUserMock, currentSeasonMock } = vi.hoisted(() => ({
  currentUserMock: vi.fn(),
  currentSeasonMock: vi.fn(),
}));
vi.mock("@/features/roles/guard", () => ({ currentUser: currentUserMock }));
vi.mock("@/features/season/season-status", () => ({
  currentSeason: currentSeasonMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/discord-posts/sync", () => ({
  syncResultPost: vi.fn(),
}));

const { reportMatch } = await import("@/features/reporting/actions");
const { openDispute } = await import("@/features/reporting/dispute-actions");
const { register } = await import("@/features/registration/actions");

const player = randomUUID();
let windowId: string;

function signedInAs(guildMember: boolean | null) {
  currentUserMock.mockResolvedValue({
    userId: player,
    discordId: "1",
    role: "player",
    displayName: "Testnutzer",
    username: "test",
    avatarUrl: null,
    guildMember,
  });
}

beforeAll(async () => {
  await db.execute(sql`insert into auth.users (id) values (${player})`);
  // Cleared like the other suites: a leftover window would decide what the
  // latest season is.
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
  currentSeasonMock.mockResolvedValue({
    window: { id: windowId, seasonNumber: 9 },
    phase: "regular_season",
  });
});

afterAll(async () => {
  await db.delete(registrationWindows);
  await db.execute(sql`delete from auth.users where id = ${player}`);
});

describe("player actions", () => {
  // Garbage match id on purpose: the lock must answer before the action looks
  // at anything the caller controls.
  it("refuses a confirmed non-member before touching the match", async () => {
    signedInAs(false);

    expect(await reportMatch({ matchId: "not-a-uuid", report: {} })).toEqual({
      ok: false,
      error: MEMBERSHIP_ERROR,
    });
    expect(await openDispute({ matchId: "not-a-uuid", reason: "x" })).toEqual({
      ok: false,
      error: MEMBERSHIP_ERROR,
    });
  });

  // The player has no acceptance row, so the Regelwerk lock answering proves
  // both that unknown membership fails open and that membership is checked
  // first when it is confirmed false.
  it("falls through to the Regelwerk lock on unknown membership", async () => {
    signedInAs(null);

    expect(await reportMatch({ matchId: "not-a-uuid", report: {} })).toEqual({
      ok: false,
      error: LOCKED_ERROR,
    });
    expect(await openDispute({ matchId: "not-a-uuid", reason: "x" })).toEqual({
      ok: false,
      error: LOCKED_ERROR,
    });
  });
});

describe("register", () => {
  it("refuses a confirmed non-member", async () => {
    signedInAs(false);

    expect(await register({})).toEqual({
      ok: false,
      error: MEMBERSHIP_ERROR,
    });
  });

  it("fails open on unknown membership", async () => {
    signedInAs(null);

    const result = await register({});

    // Still rejected — the payload is garbage — but past the membership gate.
    expect(result.ok).toBe(false);
    expect(result).not.toEqual({ ok: false, error: MEMBERSHIP_ERROR });
  });
});
