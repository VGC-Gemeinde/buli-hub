import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { profiles, registrations } from "@/db/schema";
import type {
  Platform,
  PlayerStatus,
} from "@/features/registration/registration";
import {
  assignPlayersToDivision,
  finalizeSeeding,
  generateSubDivisionsForDivision,
  listDivisions,
  listSeedingPlayers,
  saveSeedingConfig,
} from "@/features/seeding/queries";
import { db } from "@/lib/db";

// Dev-only test-data generator: a closed registration window filled with fake
// registered players so staff can exercise the seeding tool at realistic
// volume. Fake users are tagged by email so they can be cleared without
// touching the dev personas.
const SEED_EMAIL_PREFIX = "seed-";
const SEED_EMAIL_DOMAIN = "@example.test";

const NAME_POOL = [
  "Kuro",
  "Falinks",
  "Pawmi",
  "Wooloo",
  "Mika",
  "Nico",
  "Luca",
  "Finn",
  "Jonas",
  "Lena",
  "Sophie",
  "Tim",
  "Maxi",
  "Ben",
  "Paul",
  "Emma",
  "Mia",
  "Noah",
  "Leon",
  "Elias",
  "Hannah",
  "Jara",
  "Sven",
  "Timo",
  "Kira",
  "Ravi",
  "Dennis",
  "Anna",
  "Lars",
  "Marek",
];

export type SeedRegistration = {
  displayName: string;
  username: string;
  platform: Platform;
  status: PlayerStatus;
  skillSelfRating: number | null;
  participatedBefore: boolean | null;
  prevSeason: string | null;
  prevName: string | null;
  prevDivision: number | null;
  prevPlacement: number | null;
};

// Pure: builds `count` registration specs. `rng` is injectable so the mix is
// testable; defaults to Math.random.
export function buildSeedRegistrations(
  count: number,
  rng: () => number = Math.random,
): SeedRegistration[] {
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(rng() * arr.length)];
  const specs: SeedRegistration[] = [];
  for (let i = 0; i < count; i++) {
    const base = pick(NAME_POOL);
    const displayName = `${base}${Math.floor(rng() * 900) + 100}`;
    const username = `${base.toLowerCase()}_${i}`;
    const platform: Platform = rng() < 0.6 ? "showdown" : "cartridge";
    const returning = rng() < 0.3;
    if (returning) {
      specs.push({
        displayName,
        username,
        platform,
        status: "returning",
        skillSelfRating: null,
        participatedBefore: true,
        prevSeason: `Saison ${Math.floor(rng() * 4) + 1}`,
        prevName: displayName,
        prevDivision: Math.floor(rng() * 5) + 1,
        prevPlacement: Math.floor(rng() * 8) + 1,
      });
    } else {
      specs.push({
        displayName,
        username,
        platform,
        status: "new",
        skillSelfRating: Math.floor(rng() * 11),
        participatedBefore: false,
        prevSeason: null,
        prevName: null,
        prevDivision: null,
        prevPlacement: null,
      });
    }
  }
  return specs;
}

// Removes all seeding/registration test data and the generated fake users
// (windows first so the opened_by FK does not block deleting the users).
export async function clearSeedData() {
  await db.execute(sql`delete from registration_windows`);
  await db.execute(
    sql`delete from auth.users where email like ${`${SEED_EMAIL_PREFIX}%${SEED_EMAIL_DOMAIN}`}`,
  );
}

// Builds a complete, finalized seeding from the window's registered players:
// picks a division count, distributes players round-robin across divisions,
// generates sub-divisions, and finalizes. Lets the „Spielplan erstellen" flow
// be exercised without hand-running the seeding tool.
async function finalizeDevSeeding(
  windowId: string,
  divisionCount: number,
  size: number,
): Promise<void> {
  await saveSeedingConfig(windowId, size, divisionCount);
  const players = await listSeedingPlayers(windowId);
  const divisions = await listDivisions(windowId);
  if (divisions.length === 0) {
    return;
  }

  const byDivision = new Map<string, string[]>();
  players.forEach((player, i) => {
    const division = divisions[i % divisions.length];
    const list = byDivision.get(division.id);
    if (list) {
      list.push(player.userId);
    } else {
      byDivision.set(division.id, [player.userId]);
    }
  });
  for (const [divisionId, userIds] of byDivision) {
    await assignPlayersToDivision(windowId, userIds, divisionId);
  }
  for (const division of divisions) {
    await generateSubDivisionsForDivision(windowId, division.id);
  }
  await finalizeSeeding(windowId);
}

export async function generateSeedData(
  count: number,
  finalize = false,
): Promise<number> {
  await clearSeedData();

  const specs = buildSeedRegistrations(count);
  const ids = specs.map(() => randomUUID());

  // Fake auth users (one multi-row insert), then their profiles.
  const userValues = specs.map(
    (_, i) =>
      sql`(${ids[i]}, ${`${SEED_EMAIL_PREFIX}${i}${SEED_EMAIL_DOMAIN}`})`,
  );
  await db.execute(
    sql`insert into auth.users (id, email) values ${sql.join(userValues, sql`, `)}`,
  );
  await db.insert(profiles).values(
    specs.map((spec, i) => ({
      userId: ids[i],
      displayName: spec.displayName,
      username: spec.username,
    })),
  );

  // A closed window (opened_by one of the fake users), then the registrations.
  const [window] = await db.execute<{ id: string }>(
    sql`insert into registration_windows (opened_at, closes_at, opened_by)
        values (now() - interval '40 days', now() - interval '1 day', ${ids[0]})
        returning id`,
  );

  await db.insert(registrations).values(
    specs.map((spec, i) => ({
      windowId: window.id,
      userId: ids[i],
      platform: spec.platform,
      status: spec.status,
      participatedBefore: spec.participatedBefore,
      prevSeason: spec.prevSeason,
      prevName: spec.prevName,
      prevDivision: spec.prevDivision,
      prevPlacement: spec.prevPlacement,
      skillSelfRating: spec.skillSelfRating,
    })),
  );

  if (finalize) {
    await finalizeDevSeeding(window.id, 2, 8);
  }

  return specs.length;
}
