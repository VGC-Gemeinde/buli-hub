import { randomUUID } from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import {
  divisions,
  matches,
  matchGames,
  matchResults,
  profiles,
  registrations,
  subDivisions,
} from "@/db/schema";
import type {
  Platform,
  PlayerStatus,
} from "@/features/registration/registration";
import {
  persistSchedule,
  subDivisionRosters,
} from "@/features/schedule/queries";
import { generateRoundRobin } from "@/features/schedule/round-robin";
import {
  defaultDeadlines,
  spieltagCount,
  windowsFromDeadlines,
} from "@/features/schedule/spieltage";
import { currentMatchday } from "@/features/season/dashboard";
import { matchdaysForWindow } from "@/features/season/queries";
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

// Generates the season's schedule from a finalized seeding, starting two weeks
// in the past so the Spieler-Dashboard shows a mid-season state (past, current
// and upcoming matchdays) rather than everything at round 1.
async function generateDevSchedule(windowId: string): Promise<void> {
  const rosters = await subDivisionRosters(windowId);
  const count = spieltagCount(rosters.map((roster) => roster.userIds.length));
  if (count === 0) {
    return;
  }
  const seasonStart = new Date(Date.now() - 14 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const deadlines = defaultDeadlines(seasonStart, count);
  const windows = windowsFromDeadlines(seasonStart, deadlines);
  const matchRows = rosters.flatMap((roster) =>
    generateRoundRobin(roster.userIds).flatMap((pairings, roundIndex) =>
      pairings.map((pairing) => ({
        subDivisionId: roster.subDivisionId,
        round: roundIndex + 1,
        playerAId: pairing.a,
        playerBId: pairing.b,
      })),
    ),
  );
  await persistSchedule(windowId, windows, matchRows);
}

// Fills the season with varied, lived-in results so the dashboards and
// standings have something to chew on. Past rounds are mostly reported with
// mixed winners and 2:0/2:1 scores, plus one of each edge state (overdue,
// pending free win, confirmed free win, double loss); the current round is
// half-reported (the rest „offen"); future rounds stay open.
async function seedDevResults(windowId: string): Promise<void> {
  const days = await matchdaysForWindow(windowId);
  const today = new Date().toISOString().slice(0, 10);
  const currentRound = currentMatchday(days, today)?.round ?? 1;

  const all = (
    await db
      .select({
        id: matches.id,
        round: matches.round,
        playerAId: matches.playerAId,
        playerBId: matches.playerBId,
      })
      .from(matches)
      .innerJoin(subDivisions, eq(subDivisions.id, matches.subDivisionId))
      .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
      .where(eq(divisions.windowId, windowId))
      .orderBy(asc(matches.round), asc(matches.id))
  ).filter((match) => match.playerBId !== null);

  const reportNormal = async (
    matchId: string,
    a: string,
    b: string,
    winner: string,
    sweep: boolean,
  ) => {
    const loser = winner === a ? b : a;
    const games = sweep ? [winner, winner] : [winner, loser, winner];
    await db.insert(matchResults).values({
      matchId,
      outcome: "normal",
      winnerId: winner,
      platform: "showdown",
      playerATeamUrl: "https://pokepast.es/seed-a",
      playerBTeamUrl: "https://pokepast.es/seed-b",
      reportedById: a,
    });
    await db.insert(matchGames).values(
      games.map((w, i) => ({
        matchId,
        gameNumber: i + 1,
        winnerId: w,
        replayUrl: `https://replay.pokemonshowdown.com/seed-${i + 1}`,
      })),
    );
  };

  let past = 0;
  let current = 0;
  for (const match of all) {
    const a = match.playerAId;
    const b = match.playerBId as string;

    if (match.round < currentRound) {
      const k = past++;
      if (k === 0) continue; // overdue (unreported past)
      if (k === 1) {
        await db.insert(matchResults).values({
          matchId: match.id,
          outcome: "free_win",
          winnerId: a,
          freeWinReason: "Gegner war trotz mehrerer Anfragen nicht erreichbar.",
          reportedById: a,
        }); // pending confirmation
        continue;
      }
      if (k === 2) {
        await db.insert(matchResults).values({
          matchId: match.id,
          outcome: "free_win",
          winnerId: b,
          freeWinReason: "Kein gemeinsamer Termin gefunden.",
          reportedById: b,
          confirmedById: a,
          confirmedAt: new Date(),
        }); // confirmed → counts
        continue;
      }
      if (k === 3) {
        await db.insert(matchResults).values({
          matchId: match.id,
          outcome: "double_loss",
          winnerId: null,
          reportedById: a,
        });
        continue;
      }
      await reportNormal(match.id, a, b, k % 2 === 0 ? a : b, k % 3 === 0);
      continue;
    }

    if (match.round === currentRound) {
      const k = current++;
      if (k % 2 === 0) {
        await reportNormal(match.id, a, b, k % 4 === 0 ? a : b, false);
      }
      // odd → left „offen" this week
    }
    // future rounds stay open
  }
}

export async function generateSeedData(
  count: number,
  opts: {
    finalize?: boolean;
    schedule?: boolean;
    includeUserId?: string;
  } = {},
): Promise<number> {
  // A schedule needs a finalized seeding to build from.
  const finalize = opts.finalize || opts.schedule;
  await clearSeedData();

  const specs = buildSeedRegistrations(count);
  const ids: string[] = specs.map(() => randomUUID());

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

  // Register the signed-in persona too, so a running-season seed populates
  // *their* Spieler-Dashboard. Their profile already exists (created on
  // /dev/login), so only a registration row is added — before finalizing, so
  // they get placed with everyone else.
  if (opts.includeUserId && !ids.includes(opts.includeUserId)) {
    await db
      .insert(registrations)
      .values({
        windowId: window.id,
        userId: opts.includeUserId,
        platform: "showdown",
        status: "new",
        participatedBefore: false,
        skillSelfRating: 7,
      })
      .onConflictDoNothing();
  }

  if (finalize) {
    await finalizeDevSeeding(window.id, 2, 8);
  }
  if (opts.schedule) {
    await generateDevSchedule(window.id);
    await seedDevResults(window.id);
  }

  return specs.length;
}
