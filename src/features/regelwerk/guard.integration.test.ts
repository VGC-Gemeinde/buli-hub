import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { regelwerkAcceptances, registrationWindows } from "@/db/schema";
import { LOCKED_ERROR } from "@/features/regelwerk/acceptance";
import { db } from "@/lib/db";

// The lock is the whole point of slice 2: „a disabled button is not
// authorization" (design §5.2). These tests exercise it against a real
// database, with the season phase mocked because building a finalized seeding
// plus a schedule per case would test the seeding feature, not this one.

const { currentSeasonMock } = vi.hoisted(() => ({
  currentSeasonMock: vi.fn(),
}));
vi.mock("@/features/season/season-status", () => ({
  currentSeason: currentSeasonMock,
}));

const { regelwerkBlock } = await import("./guard");
const { recordAcceptance } = await import("./queries");

const player = randomUUID();
let windowId: string;

function seasonIs(phase: string) {
  currentSeasonMock.mockResolvedValue({
    window: { id: windowId, seasonNumber: 9 },
    phase,
  });
}

beforeAll(async () => {
  await db.execute(sql`insert into auth.users (id) values (${player})`);
  const [row] = await db
    .insert(registrationWindows)
    .values({
      closesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      openedBy: player,
      seasonNumber: 9,
    })
    .returning({ id: registrationWindows.id });
  windowId = row.id;
});

afterEach(async () => {
  vi.clearAllMocks();
  await db.delete(regelwerkAcceptances);
});

afterAll(async () => {
  await db.delete(registrationWindows);
  await db.execute(sql`delete from auth.users where id = ${player}`);
});

describe("regelwerkBlock", () => {
  it("blocks an unaccepted player during the running season", async () => {
    seasonIs("regular_season");

    expect(await regelwerkBlock(player)).toEqual({
      ok: false,
      error: LOCKED_ERROR,
    });
  });

  it("lets an accepted player through", async () => {
    seasonIs("regular_season");
    await recordAcceptance(windowId, player);

    expect(await regelwerkBlock(player)).toBeNull();
  });

  // Player actions do not exist yet in these phases; blocking would be an
  // error message for something nobody can do.
  it("does not block before the season runs", async () => {
    for (const phase of [
      "registration_open",
      "registration_closed",
      "seeded",
    ]) {
      seasonIs(phase);

      expect(await regelwerkBlock(player)).toBeNull();
    }
  });

  it("does not block when no season exists", async () => {
    currentSeasonMock.mockResolvedValue({ window: null, phase: "not_started" });

    expect(await regelwerkBlock(player)).toBeNull();
  });

  // Acceptance is per season: last season's confirmation must not unlock this
  // one, which is the failure the (window, user) key exists to prevent.
  it("ignores an acceptance for a different season", async () => {
    const [older] = await db
      .insert(registrationWindows)
      .values({
        openedAt: new Date(Date.UTC(2025, 0, 1)),
        closesAt: new Date(Date.UTC(2025, 1, 1)),
        openedBy: player,
        seasonNumber: 8,
      })
      .returning({ id: registrationWindows.id });
    await recordAcceptance(older.id, player);
    seasonIs("regular_season");

    expect(await regelwerkBlock(player)).toEqual({
      ok: false,
      error: LOCKED_ERROR,
    });
  });
});
