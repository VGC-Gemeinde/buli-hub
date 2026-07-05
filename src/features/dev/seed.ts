import { randomUUID } from "node:crypto";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import {
  disputes,
  divisions,
  matches,
  matchGames,
  matchResults,
  motwSelections,
  profiles,
  registrations,
  subDivisions,
} from "@/db/schema";
import { syncResultPost } from "@/features/discord-posts/sync";
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
  divisionModeAvailable,
  validatePostSeason,
} from "@/features/seeding/post-season";
import {
  assignPlayersToDivision,
  divisionsWithGroupSizes,
  finalizeSeeding,
  generateSubDivisionsForDivision,
  listDivisions,
  listSeedingPlayers,
  savePostSeasonConfig,
  saveSeedingConfig,
} from "@/features/seeding/queries";
import { latestWindow } from "@/features/staff/queries";
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
  await applyDevPostSeason(windowId);
  await finalizeSeeding(windowId);
}

// A valid, balanced post-season config so seeded seasons behave like real
// finalized ones (finalize requires it). Baseline: playoff-only paths (all
// guaranteed 0 → balances trivially, works for any structure). When there are
// exactly two divisions with equal-size groups, use a richer demo: the top
// division demotes one per group and the bottom promotes the same total via its
// global division table — so the Gesamttabelle + guaranteed zones are exercised.
async function applyDevPostSeason(windowId: string): Promise<void> {
  const divs = (await divisionsWithGroupSizes(windowId)).sort(
    (a, b) => a.tier - b.tier,
  );
  if (divs.length === 0) {
    return;
  }

  const configs = divs.map((division, i) => ({
    divisionId: division.id,
    relevantTable: "sub_division" as "sub_division" | "division",
    guaranteedPromotions: 0,
    guaranteedDemotions: 0,
    promotionPlayoffSlots: i === 0 ? 0 : 1,
    demotionPlayoffSlots: i === divs.length - 1 ? 0 : 1,
    // Top division always gets a title playoff so the champion zone is seeded.
    championshipPlayoffSlots: i === 0 ? 2 : 0,
  }));

  const richDemo =
    divs.length === 2 && divs.every((d) => divisionModeAvailable(d.groupSizes));
  if (richDemo) {
    const demoteTotal = divs[0].groupSizes.length; // 1 per group of the top division
    configs[0] = {
      divisionId: divs[0].id,
      relevantTable: "sub_division",
      guaranteedPromotions: 0,
      guaranteedDemotions: 1,
      promotionPlayoffSlots: 0,
      demotionPlayoffSlots: 0,
      championshipPlayoffSlots: 2,
    };
    configs[1] = {
      divisionId: divs[1].id,
      relevantTable: "division",
      guaranteedPromotions: demoteTotal,
      guaranteedDemotions: 0,
      promotionPlayoffSlots: 0,
      demotionPlayoffSlots: 0,
      championshipPlayoffSlots: 0,
    };
  }

  const valid =
    validatePostSeason(
      divs.map((d, i) => ({
        tier: d.tier,
        groupSizes: d.groupSizes,
        relevantTable: configs[i].relevantTable,
        guaranteedPromotions: configs[i].guaranteedPromotions,
        guaranteedDemotions: configs[i].guaranteedDemotions,
        promotionPlayoffSlots: configs[i].promotionPlayoffSlots,
        demotionPlayoffSlots: configs[i].demotionPlayoffSlots,
        championshipPlayoffSlots: configs[i].championshipPlayoffSlots,
      })),
    ).length === 0;
  await savePostSeasonConfig(windowId, configs, valid);
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

// Writes a normal best-of-3 result the way a player report stores it (result
// row + game rows with replay links).
async function insertNormalResult(
  matchId: string,
  a: string,
  b: string,
  winner: string,
  sweep: boolean,
): Promise<void> {
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
}

// Dev-only: reports up to `count` open (unreported, non-bye) matches of the
// latest season like real player reports — including the Discord result-post
// sync, so the results channel can be exercised end to end (set
// DISCORD_RESULTS_CHANNEL_ID; without it the sync is silently skipped).
// Alternating winners, a 2-0 sweep every third match. Returns how many
// matches were reported.
export async function reportDevResults(count: number): Promise<number> {
  const window = await latestWindow();
  if (!window) {
    return 0;
  }
  const open = await db
    .select({
      id: matches.id,
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
    })
    .from(matches)
    .innerJoin(subDivisions, eq(subDivisions.id, matches.subDivisionId))
    .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .leftJoin(matchResults, eq(matchResults.matchId, matches.id))
    .where(
      and(
        eq(divisions.windowId, window.id),
        isNotNull(matches.playerBId),
        isNull(matchResults.matchId),
      ),
    )
    .orderBy(asc(matches.round), asc(matches.id))
    .limit(count);

  let index = 0;
  for (const match of open) {
    const a = match.playerAId;
    const b = match.playerBId as string;
    await insertNormalResult(
      match.id,
      a,
      b,
      index % 2 === 0 ? a : b,
      index % 3 === 0,
    );
    // Sequential on purpose: Discord's per-channel rate limit is ~5 messages
    // per 5 seconds; the round trips pace the burst.
    await syncResultPost(match.id);
    index++;
  }
  return open.length;
}

// Fills the season with varied, lived-in results so the dashboards and
// standings have something to chew on. Past rounds are mostly reported with
// mixed winners and 2:0/2:1 scores, plus one of each edge state (overdue,
// pending free win, confirmed free win, double loss); the current round is
// half-reported (the rest „offen"); future rounds stay open.
async function seedDevResults(
  windowId: string,
  staffId: string,
): Promise<void> {
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

  const reportNormal = insertNormalResult;

  // Reported normal matches (matchId + participants) to hang disputes on.
  const reportedNormal: { matchId: string; a: string; b: string }[] = [];
  // The current round's Match of the Week (first reported current-round match,
  // so block + badge + spoiler reveal all have something to show).
  let motwMatchId: string | null = null;

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
          discussedWithId: staffId,
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
          discussedWithId: staffId,
          reportedById: b,
          confirmedById: staffId,
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
      reportedNormal.push({ matchId: match.id, a, b });
      continue;
    }

    if (match.round === currentRound) {
      const k = current++;
      if (k % 2 === 0) {
        await reportNormal(match.id, a, b, k % 4 === 0 ? a : b, false);
        motwMatchId ??= match.id;
      }
      // odd → left „offen" this week
    }
    // future rounds stay open
  }

  // Feature it as the Match of the Week — with a VOD link, so the public
  // block shows both the YouTube button and the spoiler-protected result.
  if (motwMatchId) {
    await db.insert(motwSelections).values({
      windowId,
      round: currentRound,
      matchId: motwMatchId,
      youtubeUrl: "https://www.youtube.com/watch?v=vgc-bundesliga",
      selectedById: staffId,
    });
  }

  // One open dispute (loser contests the result) and one already resolved, so
  // both the „Angefochten" worklist and the resolved history have content.
  if (reportedNormal[0]) {
    const m = reportedNormal[0];
    await db.insert(disputes).values({
      matchId: m.matchId,
      openedById: m.b,
      reason: "Spiel 2 ging an mich, das Ergebnis stimmt nicht.",
    });
  }
  if (reportedNormal[1]) {
    const m = reportedNormal[1];
    await db.insert(disputes).values({
      matchId: m.matchId,
      openedById: m.b,
      reason: "Falscher Sieger gemeldet.",
      status: "resolved",
      resolution: "upheld",
      resolvedById: m.a,
      resolvedAt: new Date(),
    });
  }
}

export async function generateSeedData(
  count: number,
  opts: {
    finalize?: boolean;
    schedule?: boolean;
    includeUserId?: string;
    size?: number;
    divisionCount?: number;
  } = {},
): Promise<{ windowId: string; staffId: string }> {
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

  // A staff member: opens the window and is the „besprochen mit" contact on
  // player-reported free wins. Not registered — staff don't play the season.
  const staffId = randomUUID();
  await db.execute(
    sql`insert into auth.users (id, email) values (${staffId}, ${`${SEED_EMAIL_PREFIX}staff${SEED_EMAIL_DOMAIN}`})`,
  );
  await db.insert(profiles).values({
    userId: staffId,
    displayName: "Orga Team",
    username: "orga",
    role: "staff",
  });

  // A closed window opened by the staff member, then the registrations.
  const [window] = await db.execute<{ id: string }>(
    sql`insert into registration_windows (opened_at, closes_at, opened_by, season_number)
        values (now() - interval '40 days', now() - interval '1 day', ${staffId}, 9)
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
    await finalizeDevSeeding(
      window.id,
      opts.divisionCount ?? 2,
      opts.size ?? 8,
    );
  }
  if (opts.schedule) {
    await generateDevSchedule(window.id);
    await seedDevResults(window.id, staffId);
  }

  return { windowId: window.id, staffId };
}

// A running season whose sub-divisions are all the same size, so the division
// table shows up on the Spieler-Dashboard — it only appears when every group in
// a division is equal size. Two divisions of 24 players each split into three
// groups of 8 (…1a / 1b / 1c). The signed-in persona is registered and placed,
// landing in one of the equal groups. The fake count is chosen so the total —
// with or without the persona — is 48 and always divides evenly.
const EVEN_DIVISION_COUNT = 2;
const EVEN_SUB_DIVISION_SIZE = 8;
const EVEN_TOTAL_PLAYERS = 48;

export async function generateEvenRunningSeason(
  includeUserId?: string,
): Promise<void> {
  const fakeCount = EVEN_TOTAL_PLAYERS - (includeUserId ? 1 : 0);
  await generateSeedData(fakeCount, {
    schedule: true,
    includeUserId,
    size: EVEN_SUB_DIVISION_SIZE,
    divisionCount: EVEN_DIVISION_COUNT,
  });
}

// A three-division running season with the signed-in persona placed in the
// **middle** division — the only one that can have all four zones (direct
// promotion + playoff and direct demotion + playoff). Two variants differ only in
// how that middle division is decided: its global Gesamttabelle, or one
// Gruppentabelle per group. Every division has two equal groups of 8 (16 each,
// 48 total), so the Gesamttabelle option is available.
const LADDER_SIZE = 8;
const LADDER_TOTAL_PLAYERS = 48; // 3 divisions × 16

export async function generateLadderSeason(
  div2Mode: "division" | "sub_division",
  includeUserId?: string,
): Promise<void> {
  const fakeCount = LADDER_TOTAL_PLAYERS - (includeUserId ? 1 : 0);
  // Registrations only — we drive the placement ourselves so the persona lands
  // in the middle division.
  const { windowId, staffId } = await generateSeedData(fakeCount, {
    includeUserId,
  });

  await saveSeedingConfig(windowId, LADDER_SIZE, 3);
  const divisions = await listDivisions(windowId); // tiers 1, 2, 3
  const byTier = new Map(divisions.map((d) => [d.tier, d.id]));
  const players = (await listSeedingPlayers(windowId)).map((p) => p.userId);

  // Middle division gets the persona; fill the three divisions to 16 each.
  const rest = players.filter((id) => id !== includeUserId);
  const middle = includeUserId
    ? [includeUserId, ...rest.slice(0, 15)]
    : rest.slice(0, 16);
  const remaining = includeUserId ? rest.slice(15) : rest.slice(16);
  const top = remaining.slice(0, 16);
  const bottom = remaining.slice(16, 32);

  const topId = byTier.get(1);
  const middleId = byTier.get(2);
  const bottomId = byTier.get(3);
  if (topId && middleId && bottomId) {
    await assignPlayersToDivision(windowId, top, topId);
    await assignPlayersToDivision(windowId, middle, middleId);
    await assignPlayersToDivision(windowId, bottom, bottomId);
  }
  for (const division of divisions) {
    await generateSubDivisionsForDivision(windowId, division.id);
  }

  await applyLadderPostSeason(windowId, div2Mode);
  await finalizeSeeding(windowId);
  await generateDevSchedule(windowId);
  await seedDevResults(windowId, staffId);
}

// The ladder's balanced post-season config: top demotes into the middle, the
// middle fully exchanges both ways, the bottom promotes into the middle. Only the
// middle division's mode/counts change between the two variants.
async function applyLadderPostSeason(
  windowId: string,
  div2Mode: "division" | "sub_division",
): Promise<void> {
  const divs = (await divisionsWithGroupSizes(windowId)).sort(
    (a, b) => a.tier - b.tier,
  );
  if (divs.length !== 3) {
    return;
  }
  const [top, middle, bottom] = divs;

  const middleConfig =
    div2Mode === "division"
      ? {
          divisionId: middle.id,
          relevantTable: "division" as const,
          guaranteedPromotions: 2,
          guaranteedDemotions: 2,
          promotionPlayoffSlots: 2,
          demotionPlayoffSlots: 2,
          championshipPlayoffSlots: 0,
        }
      : {
          divisionId: middle.id,
          relevantTable: "sub_division" as const,
          guaranteedPromotions: 1,
          guaranteedDemotions: 1,
          promotionPlayoffSlots: 1,
          demotionPlayoffSlots: 1,
          championshipPlayoffSlots: 0,
        };

  const configs = [
    {
      divisionId: top.id,
      relevantTable: "sub_division" as const,
      guaranteedPromotions: 0,
      guaranteedDemotions: 1,
      promotionPlayoffSlots: 0,
      demotionPlayoffSlots: 1,
      championshipPlayoffSlots: 2, // Division 1 title playoff
    },
    middleConfig,
    {
      divisionId: bottom.id,
      relevantTable: "sub_division" as const,
      guaranteedPromotions: 1,
      guaranteedDemotions: 0,
      promotionPlayoffSlots: 1,
      demotionPlayoffSlots: 0,
      championshipPlayoffSlots: 0,
    },
  ];

  const valid =
    validatePostSeason(
      divs.map((d, i) => ({
        tier: d.tier,
        groupSizes: d.groupSizes,
        relevantTable: configs[i].relevantTable,
        guaranteedPromotions: configs[i].guaranteedPromotions,
        guaranteedDemotions: configs[i].guaranteedDemotions,
        promotionPlayoffSlots: configs[i].promotionPlayoffSlots,
        demotionPlayoffSlots: configs[i].demotionPlayoffSlots,
        championshipPlayoffSlots: configs[i].championshipPlayoffSlots,
      })),
    ).length === 0;
  await savePostSeasonConfig(windowId, configs, valid);
}
