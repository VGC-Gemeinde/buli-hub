import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
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
  regelwerkAcceptances,
  registrations,
  registrationWindows,
} from "@/db/schema";
import { db } from "@/lib/db";

// The properties that matter: acceptance is per season, it is idempotent, and
// the stored timestamp never moves once set.

const { currentUserMock } = vi.hoisted(() => ({ currentUserMock: vi.fn() }));
vi.mock("@/features/roles/guard", () => ({ currentUser: currentUserMock }));
// `register` reads the session straight from Supabase rather than through
// currentUser(), so it needs its own stand-in.
let supabaseUser: string | null = null;
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: supabaseUser ? { id: supabaseUser } : null },
      }),
    },
  }),
}));
// revalidatePath needs the request-scoped store Next sets up per render, which
// a test runner has no equivalent of. Cache invalidation is framework plumbing,
// not the behaviour under test.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { acceptRegelwerk } = await import("./actions");
const { acceptedAt, recordAcceptance } = await import("./queries");
const { register } = await import("@/features/registration/actions");

const player = randomUUID();
const other = randomUUID();

function signedInAs(userId: string) {
  currentUserMock.mockResolvedValue({
    userId,
    discordId: "1",
    role: "player",
    displayName: "Testnutzer",
    username: "test",
    avatarUrl: null,
  });
}

/**
 * Opens a season. `openedAt` is explicit and far in the future, because the
 * action resolves „the running season" through `latestWindow()`, which orders
 * by it: the fixture has to be newer than anything else in the database, and
 * two windows in one test have to be ordered by more than how fast the machine
 * ran.
 */
async function openSeason(seasonNumber: number): Promise<string> {
  const [row] = await db
    .insert(registrationWindows)
    .values({
      openedAt: new Date(Date.UTC(2099, 0, seasonNumber)),
      closesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      openedBy: player,
      seasonNumber,
    })
    .returning({ id: registrationWindows.id });
  return row.id;
}

beforeAll(async () => {
  // Shared table, cleared up front like the other integration suites: a window
  // left behind by another test — or by the /dev seeding tools — would
  // otherwise decide what „the running season" is.
  await db.delete(registrationWindows);
  for (const id of [player, other]) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }
});

afterEach(async () => {
  vi.clearAllMocks();
  supabaseUser = null;
  await db.delete(registrations);
  await db.delete(regelwerkAcceptances);
  await db.delete(registrationWindows);
});

afterAll(async () => {
  for (const id of [player, other]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("acceptRegelwerk", () => {
  it("records one acceptance for the running season", async () => {
    const windowId = await openSeason(9);
    signedInAs(player);

    const result = await acceptRegelwerk();

    expect(result.ok).toBe(true);
    expect(await acceptedAt(windowId, player)).not.toBeNull();
  });

  it("refuses when nobody is signed in", async () => {
    await openSeason(9);
    currentUserMock.mockResolvedValue(null);

    expect(await acceptRegelwerk()).toEqual({
      ok: false,
      error: "Nicht angemeldet",
    });
  });

  it("refuses when no season exists", async () => {
    signedInAs(player);

    const result = await acceptRegelwerk();

    expect(result.ok).toBe(false);
  });

  // A second click is not a second acceptance, and the date shown back to the
  // player has to be the one they actually confirmed on.
  it("is idempotent and keeps the original timestamp", async () => {
    const windowId = await openSeason(9);
    signedInAs(player);

    const first = await acceptRegelwerk();
    const second = await acceptRegelwerk();

    expect(first).toEqual(second);
    const rows = await db
      .select()
      .from(regelwerkAcceptances)
      .where(eq(regelwerkAcceptances.windowId, windowId));
    expect(rows).toHaveLength(1);
  });

  it("keeps players' acceptances apart", async () => {
    const windowId = await openSeason(9);
    signedInAs(player);
    await acceptRegelwerk();

    expect(await acceptedAt(windowId, player)).not.toBeNull();
    expect(await acceptedAt(windowId, other)).toBeNull();
  });
});

// The main path: almost every acceptance in the database gets here, not
// through a dialog. The registration form gates its own submit on the
// Regelwerk checkbox, so reaching `register` means the player agreed.
describe("register", () => {
  it("records the acceptance along with the registration", async () => {
    const windowId = await openSeason(9);
    signedInAs(player);
    supabaseUser = player;

    const result = await register({
      platform: "showdown",
      participatedBefore: false,
      newPlayer: { skillSelfRating: 5, greatestAchievements: "" },
    });

    expect(result).toEqual({ ok: true });
    expect(await acceptedAt(windowId, player)).not.toBeNull();
  });
});

describe("per-season scope", () => {
  // The reason acceptance is a row and not a profile boolean.
  it("does not carry an acceptance into the next season", async () => {
    const saison9 = await openSeason(9);
    await recordAcceptance(saison9, player);

    const saison10 = await openSeason(10);

    expect(await acceptedAt(saison9, player)).not.toBeNull();
    expect(await acceptedAt(saison10, player)).toBeNull();
  });

  it("accepts the season that is running now", async () => {
    await openSeason(9);
    const saison10 = await openSeason(10);
    signedInAs(player);

    await acceptRegelwerk();

    expect(await acceptedAt(saison10, player)).not.toBeNull();
  });
});
