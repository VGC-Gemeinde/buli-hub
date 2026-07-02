import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { profiles, registrations } from "@/db/schema";
import type {
  Platform,
  PlayerStatus,
} from "@/features/registration/registration";
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
  prevDivision: string | null;
  prevPlacement: string | null;
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
        prevDivision: `Division ${Math.floor(rng() * 3) + 1}`,
        prevPlacement: `${Math.floor(rng() * 8) + 1}. Platz`,
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

export async function generateSeedData(count: number): Promise<number> {
  await clearSeedData();

  const specs = buildSeedRegistrations(count);
  const ids = specs.map(() => randomUUID());

  // Fake auth users (one multi-row insert), then their profiles.
  const userValues = specs.map(
    (spec, i) =>
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

  return specs.length;
}
