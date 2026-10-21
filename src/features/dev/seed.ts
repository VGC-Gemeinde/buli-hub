import { randomUUID } from "node:crypto";
import { and, asc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import {
  bans,
  disputes,
  divisions,
  matches,
  matchGames,
  matchResults,
  motwSelections,
  placements,
  profiles,
  recordingHolds,
  registrations,
  subDivisions,
  teamSheets,
  users,
} from "@/db/schema";
import { TOP_RESULT_TIERS } from "@/features/discord-posts/channels";
import { syncResultPost } from "@/features/discord-posts/sync";
import type {
  Platform,
  PlayerStatus,
} from "@/features/registration/registration";
import { acceptOffer, createOffer } from "@/features/replacements/queries";
import {
  markSchedulePublished,
  persistRelegationPlayoffsSchedule,
  persistSchedule,
  regularSeasonClosed,
  subDivisionRosters,
} from "@/features/schedule/queries";
import {
  relegationPlayoffsMatches,
  relegationPlayoffsWeeks,
} from "@/features/schedule/relegation-playoffs";
import { syncSeats } from "@/features/schedule/relegation-playoffs-setup";
import { generateRoundRobin } from "@/features/schedule/round-robin";
import {
  dayAfter,
  defaultDeadlines,
  spieltagCount,
  windowsFromDeadlines,
} from "@/features/schedule/spieltage";
import { currentMatchday } from "@/features/season/dashboard";
import { matchdaysForWindow } from "@/features/season/queries";
import { regularPlayerAId } from "@/features/season/regular-match";
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
  saveReplayRequirement,
  saveSeedingConfig,
} from "@/features/seeding/queries";
import { latestWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import { seedStreamPhotos } from "./stream-photo";
import { SEED_SHEET_A, SEED_SHEET_B } from "./teamsheets";

// Dev-only test-data generator: a closed registration window filled with fake
// registered players so staff can exercise the seeding tool at realistic
// volume. Fake users are tagged by their Discord id (SEED_DISCORD_PREFIX) so
// they can be cleared without touching the dev personas.

// Inserts the fake accounts: an id and a Discord id each, like a real sign-in
// (specs/004-google-cloud-migration). Impersonation (/dev/login-as) signs a
// browser in as any of them by id.
async function insertSeedUsers(
  rows: { id: string; discordId: string }[],
): Promise<void> {
  await db.insert(users).values(rows);
}

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

// Only new players are ever asked for their achievements (the veteran branch of
// the registration form does not have the field), and it is optional there — so
// a realistic sheet has a filled Erfolge column for most, but not all, new
// players. The mix is deliberate: short entries, long ones that must truncate,
// and a few that are honest about having none.
const ACHIEVEMENT_POOL = [
  "Top 16 Regional Dortmund",
  "Platz 3 bei der Herbst-Bo3",
  "Regional Top 8 Stuttgart",
  "Meister Saison 8",
  "Day 2 auf der EUIC 2025",
  "2x Top Cut bei lokalen Cups",
  "Nichts Großes, spiele hauptsächlich Ladder",
  "Platz 1 im Community-Turnier der VGC Gemeinde",
  "Top 32 bei den German Nationals, dazu mehrere Top Cuts auf kleineren Regionals und ein zweiter Platz bei einem Online-Cup mit 128 Teilnehmern",
  "Beste Ladder-Platzierung 1850 auf Showdown",
  "Halbfinale im Bundesliga-Pokal Saison 7",
  "Top 4 Midseason Showdown",
  "Zwei Jahre in Folge Top 64 auf der Worlds-Ladder",
  "Erster Platz bei einem lokalen Turnier in Köln, seitdem regelmäßig im Top Cut der Regionals",
] as const;

export type SeedRegistration = {
  displayName: string;
  username: string;
  platform: Platform;
  status: PlayerStatus;
  skillSelfRating: number | null;
  greatestAchievements: string | null;
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
        greatestAchievements: null,
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
        greatestAchievements: rng() < 0.75 ? pick(ACHIEVEMENT_POOL) : null,
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

// Every Discord id the seed hands out starts here (18-digit snowflakes), so
// clearSeedData finds its accounts and bans again: 0… bans, 1… players,
// 2… replacements, 3… the seed staff member.
const SEED_DISCORD_PREFIX = "4990000000";

function seedDiscordId(kind: 0 | 1 | 2 | 3, index: number): string {
  return `${SEED_DISCORD_PREFIX}${kind}${String(index).padStart(7, "0")}`;
}

// The Banliste (docs/plans/banlist.md) in every state: a banned hub user, a
// ban by Discord-ID on someone who never signed in, and a lifted ban as
// history.
async function seedBans(staffId: string): Promise<void> {
  const bannedId = randomUUID();
  const bannedDiscord = seedDiscordId(0, 1);
  await insertSeedUsers([{ id: bannedId, discordId: bannedDiscord }]);
  await db.insert(profiles).values({
    userId: bannedId,
    displayName: "Gebannter Bernd",
    username: "bernd_b",
  });
  const day = 86_400_000;
  await db.insert(bans).values([
    {
      discordId: bannedDiscord,
      discordName: "Gebannter Bernd",
      reason: "Beleidigungen im Discord, zweimal verwarnt.",
      bannedById: staffId,
      bannedAt: new Date(Date.now() - 20 * day),
    },
    {
      discordId: seedDiscordId(0, 2),
      discordName: "Altmeister Alfred",
      reason:
        "Aus Saison 3: Playoffs nicht angetreten, danach nicht erreichbar.",
      bannedById: staffId,
      bannedAt: new Date(Date.now() - 60 * day),
    },
    {
      discordId: seedDiscordId(0, 3),
      discordName: "Ehemals Emil",
      reason: "Account geteilt.",
      bannedById: staffId,
      bannedAt: new Date(Date.now() - 200 * day),
      liftedAt: new Date(Date.now() - 90 * day),
      liftedById: staffId,
    },
  ]);
}

// Removes all seeding/registration test data and the generated fake users
// (windows first so the opened_by FK does not block deleting the users).
export async function clearSeedData() {
  await db.execute(sql`delete from registration_windows`);
  await db.execute(
    sql`delete from bans where discord_id like ${`${SEED_DISCORD_PREFIX}%`}`,
  );
  await db.execute(
    sql`delete from users where discord_id like ${`${SEED_DISCORD_PREFIX}%`}`,
  );
}

// The shape a seeded league is built to. `groupsPerDivision` (in tier order)
// switches the player distribution from round-robin to exact slices, which is
// the only way to give divisions different group counts; `divisionTableTier`
// marks the one division decided by its Gesamttabelle.
export type DevSeedingShape = {
  divisionCount: number;
  size: number;
  groupsPerDivision?: readonly number[];
  divisionTableTier?: number;
};

// The default shape of a seeded running season: seven divisions of two groups,
// except Division 4 with five — and Division 4 alone is decided by its
// Gesamttabelle, everything else by group tables.
//
// Both oddities are deliberate. A uniform two-division season never exercised
// the division-mode ranking path or an irregular group count, so bugs in either
// only showed up against production data. This shape keeps a league-sized
// division list (the MotW picker's filter, the Liga-Übersicht switcher) and both
// table modes present in every local season.
export const DEV_DIVISION_GROUPS = [2, 2, 2, 5, 2, 2, 2] as const;
export const DEV_GROUP_SIZE = 8;
export const DEV_DIVISION_TABLE_TIER = 4;

export function devShapePlayerCount(
  groupsPerDivision: readonly number[],
  size: number,
): number {
  return groupsPerDivision.reduce((sum, groups) => sum + groups, 0) * size;
}

export const DEV_SEASON_SHAPE: DevSeedingShape = {
  divisionCount: DEV_DIVISION_GROUPS.length,
  size: DEV_GROUP_SIZE,
  groupsPerDivision: DEV_DIVISION_GROUPS,
  divisionTableTier: DEV_DIVISION_TABLE_TIER,
};

// Builds the seeding up to the grouping step: creates the divisions,
// distributes players across them and generates sub-divisions. Post-season
// rules and finalize are deliberately left out — this is the state right before
// the "Auf- & Abstieg" step.
async function groupDevSeeding(
  windowId: string,
  shape: DevSeedingShape,
): Promise<void> {
  await saveSeedingConfig(windowId, shape.size, shape.divisionCount);
  const players = await listSeedingPlayers(windowId);
  const divisions = (await listDivisions(windowId)).sort(
    (a, b) => a.tier - b.tier,
  );
  if (divisions.length === 0) {
    return;
  }

  const byDivision = new Map<string, string[]>();
  const { groupsPerDivision } = shape;
  if (groupsPerDivision) {
    // Exact slices: `generateSubDivisions` derives the group count from a
    // division's player count, so `groups × size` players is what makes a
    // division come out at the requested number of equal groups.
    let index = 0;
    divisions.forEach((division, i) => {
      const take = (groupsPerDivision[i] ?? 1) * shape.size;
      byDivision.set(
        division.id,
        players.slice(index, index + take).map((player) => player.userId),
      );
      index += take;
    });
    // A miscounted registration total would otherwise silently drop players;
    // park the remainder in the last division instead.
    if (index < players.length) {
      const last = divisions[divisions.length - 1];
      byDivision
        .get(last.id)
        ?.push(...players.slice(index).map((player) => player.userId));
    }
  } else {
    players.forEach((player, i) => {
      const division = divisions[i % divisions.length];
      const list = byDivision.get(division.id);
      if (list) {
        list.push(player.userId);
      } else {
        byDivision.set(division.id, [player.userId]);
      }
    });
  }

  for (const [divisionId, userIds] of byDivision) {
    await assignPlayersToDivision(windowId, userIds, divisionId);
  }
  for (const division of divisions) {
    await generateSubDivisionsForDivision(windowId, division.id);
  }
}

// Builds a complete, finalized seeding from the window's registered players:
// grouping plus valid post-season rules and the replay decision, then
// finalize. Lets the "Spielplan erstellen" flow be exercised without
// hand-running the seeding tool.
async function finalizeDevSeeding(
  windowId: string,
  shape: DevSeedingShape,
): Promise<void> {
  await groupDevSeeding(windowId, shape);
  await applyDevPostSeason(windowId, shape.divisionTableTier);
  // Mirrors the league's real rule: proof mandatory in divisions 1 + 2.
  await saveReplayRequirement(windowId, 2);
  await finalizeSeeding(windowId);
}

// A valid, balanced post-season config so seeded seasons behave like real
// finalized ones (finalize requires it). Baseline: playoff-only paths (all
// guaranteed 0 → balances trivially, works for any structure). When there are
// exactly two divisions with equal-size groups, use a richer demo: the top
// division demotes one per group and the bottom promotes the same total via its
// global division table — so the Gesamttabelle + guaranteed zones are exercised.
async function applyDevPostSeason(
  windowId: string,
  divisionTableTier?: number,
): Promise<void> {
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

  // One division decided by its Gesamttabelle rather than the group tables, so
  // every consumer of "the table that decides a division" meets both modes.
  if (divisionTableTier != null) {
    const index = divs.findIndex((d) => d.tier === divisionTableTier);
    if (index >= 0 && divisionModeAvailable(divs[index].groupSizes)) {
      configs[index].relevantTable = "division";
    }
  }

  // Relegation is one match per pairing, so at every boundary the demotion
  // seats above must equal the promotion seats below. Per-group counts scale
  // by the group count (a division table counts once), so the smallest
  // per-table counts that balance are the other side's factor over their gcd.
  if (!richDemo) {
    const factor = (i: number) =>
      configs[i].relevantTable === "division" ? 1 : divs[i].groupSizes.length;
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    for (let i = 0; i < divs.length - 1; i++) {
      const upper = factor(i);
      const lower = factor(i + 1);
      const common = gcd(upper, lower);
      configs[i].demotionPlayoffSlots = lower / common;
      configs[i + 1].promotionPlayoffSlots = upper / common;
    }
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

// Generates the season's schedule from a finalized seeding. Published (the
// default), it starts two weeks in the past so the Spieler-Dashboard shows a
// mid-season state; unpublished it starts today, matching the real
// schedule_hidden flow right after "Spielplan erstellen".
async function generateDevSchedule(
  windowId: string,
  publish = true,
  // When the season started; the default puts the running season two weeks
  // in.
  start?: (count: number) => string,
): Promise<void> {
  const rosters = await subDivisionRosters(windowId);
  const count = spieltagCount(rosters.map((roster) => roster.userIds.length));
  if (count === 0) {
    return;
  }
  const seasonStart =
    start?.(count) ??
    (publish ? new Date(Date.now() - 14 * 86_400_000) : new Date())
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
  if (publish) {
    await markSchedulePublished(windowId);
  }
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
    reportedById: a,
  });
  await db.insert(teamSheets).values([
    { matchId, playerId: a, source: "import", ots: SEED_SHEET_A },
    { matchId, playerId: b, source: "pokepaste", ots: SEED_SHEET_B },
  ]);
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
// sync, so the result channels can be exercised end to end (set the three
// channel ids, see `discord-posts/channels.ts`; without them the sync is
// silently skipped). Matches alternate between the top divisions and the
// rest so both result channels see traffic. Alternating winners, a 2-0 sweep
// every third match. Returns how many matches were reported.
export async function reportDevResults(count: number): Promise<number> {
  const window = await latestWindow();
  if (!window) {
    return 0;
  }
  const candidates = await db
    .select({
      id: matches.id,
      playerAId: regularPlayerAId,
      playerBId: matches.playerBId,
      tier: divisions.tier,
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
    .orderBy(asc(matches.round), asc(matches.id));
  if (candidates.length === 0) {
    return reportDevLateResults(window.id, count);
  }
  const top = candidates.filter((m) => m.tier <= TOP_RESULT_TIERS);
  const rest = candidates.filter((m) => m.tier > TOP_RESULT_TIERS);
  const open: typeof candidates = [];
  while (open.length < count && (top.length > 0 || rest.length > 0)) {
    const next =
      open.length % 2 === 0
        ? (top.shift() ?? rest.shift())
        : (rest.shift() ?? top.shift());
    if (next) {
      open.push(next);
    }
  }

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

// After the regular season: reports the tiebreaker, Relegation and playoff
// matches whose players are known, then writes the players of the matches
// they lead to, as a real report does.
async function reportDevLateResults(
  windowId: string,
  count: number,
): Promise<number> {
  if (!(await regularSeasonClosed(windowId))) {
    return 0;
  }
  const open = await db
    .select({
      id: matches.id,
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
    })
    .from(matches)
    .leftJoin(matchResults, eq(matchResults.matchId, matches.id))
    .where(
      and(
        eq(matches.windowId, windowId),
        ne(matches.stage, "regular"),
        isNotNull(matches.playerAId),
        isNotNull(matches.playerBId),
        isNull(matchResults.matchId),
      ),
    )
    .orderBy(asc(matches.round), asc(matches.position), asc(matches.id))
    .limit(count);
  let index = 0;
  for (const match of open) {
    const a = match.playerAId as string;
    const b = match.playerBId as string;
    await insertNormalResult(
      match.id,
      a,
      b,
      index % 2 === 0 ? a : b,
      index % 3 === 0,
    );
    await syncResultPost(match.id);
    index++;
  }
  await syncSeats(windowId);
  return open.length;
}

// Fills the season with varied, lived-in results so the dashboards and
// standings have something to chew on. Past rounds are mostly reported with
// mixed winners and 2:0/2:1 scores, plus one of each edge state (overdue,
// pending free win, confirmed free win, double loss); the current round is
// half-reported (the rest "offen"); future rounds stay open.
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
        playerAId: regularPlayerAId,
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
        reportedNormal.push({ matchId: match.id, a, b });
      }
      // odd → left "offen" this week
    }
    // future rounds stay open
  }

  // The Match of the Week in the shape the workspace is built for
  // (docs/plans/motw-candidates.md): the Spieltag before last is confirmed and
  // has its VOD (row pill, reveal, YouTube button), last Spieltag is confirmed
  // without one, so the billboard carries it with the result still withheld,
  // and the running Spieltag has a Hauptkandidat plus a backup that nobody has
  // decided between yet — which is what staff confirm.
  const reportedInRound = (round: number) =>
    all.filter(
      (m) =>
        m.round === round && reportedNormal.some((r) => r.matchId === m.id),
    );
  const confirmedMatch = reportedInRound(currentRound - 1)[0] ?? null;
  const vodMatch = reportedInRound(currentRound - 2)[0] ?? null;
  const motwCandidates = reportedInRound(currentRound).slice(0, 2);

  for (const [round, match, youtubeUrl] of [
    [currentRound - 1, confirmedMatch, null],
    [
      currentRound - 2,
      vodMatch,
      "https://www.youtube.com/watch?v=vgc-bundesliga",
    ],
  ] as const) {
    if (match && round >= 1) {
      await db.insert(motwSelections).values({
        windowId,
        round,
        matchId: match.id,
        youtubeUrl,
        selectedById: staffId,
      });
    }
  }

  // Drop one player who is in none of the featured matches, so tables, row
  // scores, match pages and the staff Drops list all show the state without
  // colliding with the MotW.
  const featured = new Set(
    [confirmedMatch, vodMatch, ...motwCandidates].flatMap((m) =>
      m ? [m.playerAId, m.playerBId] : [],
    ),
  );
  const dropCandidate = [...all]
    .reverse()
    .find((m) => !featured.has(m.playerAId));
  if (dropCandidate) {
    await db
      .update(placements)
      .set({
        droppedAt: new Date(),
        droppedById: staffId,
        dropReason: "Inaktivität, mehrfach nicht erreichbar.",
      })
      .where(
        and(
          eq(placements.windowId, windowId),
          eq(placements.userId, dropCandidate.playerAId),
        ),
      );
  }

  // Recording holds (docs/plans/recording-holds.md). Three of them, all
  // reported and therefore all withheld: the running week's two MotW
  // candidates (Hauptmatch + Backup, held because a candidate is a recording),
  // and one plain recording of the previous week that nobody released — the
  // stale case the destructive card on /staff warns about.
  const staleHold =
    all.find(
      (m) =>
        m.round === currentRound - 1 &&
        m.id !== confirmedMatch?.id &&
        m.playerAId !== dropCandidate?.playerAId &&
        m.playerBId !== dropCandidate?.playerAId &&
        reportedNormal.some((r) => r.matchId === m.id),
    ) ?? null;
  const holds: {
    match: (typeof all)[number];
    role: "primary" | "backup" | null;
  }[] = [
    ...motwCandidates.map((match, index) => ({
      match,
      role: (index === 0 ? "primary" : "backup") as "primary" | "backup",
    })),
    ...(staleHold ? [{ match: staleHold, role: null }] : []),
  ];
  for (const hold of holds) {
    await db.insert(recordingHolds).values({
      matchId: hold.match.id,
      windowId,
      round: hold.match.round,
      heldById: staffId,
      motwRole: hold.role,
    });
  }

  // Stream photos for two of the players the stream would show (one from the
  // confirmed Match of the Week, one from a candidate of the running week), so
  // the staff marks, the profile card and the stream payload all have a
  // picture, and their opponents show the "no photo yet" state next to them.
  const photoFor = [
    confirmedMatch?.playerAId,
    motwCandidates[0]?.playerAId,
  ].filter((id): id is string => typeof id === "string");
  if (photoFor.length > 0) {
    await seedStreamPhotos(photoFor);
  }

  // Player replacements (docs/plans/player-replacement.md), clear of every
  // player the MotW, the holds, the disputes and the plain drop already use.
  const busy = new Set(
    [
      ...featured,
      dropCandidate?.playerAId,
      staleHold?.playerAId,
      staleHold?.playerBId,
      ...reportedNormal.slice(0, 2).flatMap((m) => [m.a, m.b]),
    ].filter((id): id is string | null => id !== undefined),
  );
  await seedReplacements({
    windowId,
    staffId,
    all,
    busy,
    currentRound,
    totalRounds: days.length,
  });

  // One open dispute (loser contests the result) and one already resolved, so
  // both the "Angefochten" worklist and the resolved history have content.
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
      note: "Beide Replays geprüft, das gemeldete Ergebnis stimmt.",
    });
  }
}

// Two replacement states on top of the plain drop: a slot already taken over
// from the running Spieltag on (the earlier rounds inherited as losses; the
// replacement is a fresh seed user, so /dev/login-as shows their side), and a
// dropped player whose offer to another fresh seed user is still open —
// impersonate "Angefragt Ari" to see the acceptance card on /spieler.
async function seedReplacements(input: {
  windowId: string;
  staffId: string;
  all: { round: number; playerAId: string; playerBId: string | null }[];
  busy: ReadonlySet<string | null>;
  currentRound: number;
  totalRounds: number;
}): Promise<void> {
  const free: string[] = [];
  for (const match of input.all) {
    for (const id of [match.playerAId, match.playerBId]) {
      if (id && !input.busy.has(id) && !free.includes(id)) {
        free.push(id);
      }
    }
  }
  // Two players who never meet, so the two slots stay independent.
  const takenOver = free[0];
  const offered = free.find(
    (id) =>
      id !== takenOver &&
      !input.all.some(
        (m) =>
          (m.playerAId === takenOver && m.playerBId === id) ||
          (m.playerAId === id && m.playerBId === takenOver),
      ),
  );
  if (!takenOver || !offered) {
    return;
  }

  const newcomers = [
    { id: randomUUID(), displayName: "Nachrücker Nemo", username: "nemo_nach" },
    { id: randomUUID(), displayName: "Angefragt Ari", username: "ari_vgc" },
  ];
  await insertSeedUsers(
    newcomers.map((user, i) => ({
      id: user.id,
      discordId: seedDiscordId(2, i),
    })),
  );
  await db.insert(profiles).values(
    newcomers.map((user) => ({
      userId: user.id,
      displayName: user.displayName,
      username: user.username,
      guildMember: true,
      guildMemberCheckedAt: new Date(),
    })),
  );

  const drop = (userId: string, reason: string) =>
    db
      .update(placements)
      .set({
        droppedAt: new Date(),
        droppedById: input.staffId,
        dropReason: reason,
      })
      .where(
        and(
          eq(placements.windowId, input.windowId),
          eq(placements.userId, userId),
        ),
      );

  // Taken over from the running Spieltag (at least 2, so something is
  // inherited; at most the last one).
  const entryRound = Math.min(
    Math.max(input.currentRound, 2),
    input.totalRounds,
  );
  await drop(takenOver, "Kein Bock mehr");
  await createOffer({
    windowId: input.windowId,
    replacedUserId: takenOver,
    replacementUserId: newcomers[0].id,
    offeredById: input.staffId,
    entryRound,
  });
  await acceptOffer({
    registration: {
      windowId: input.windowId,
      userId: newcomers[0].id,
      platform: "showdown",
      status: "new",
      participatedBefore: false,
      veteran: null,
      newPlayer: {
        skillSelfRating: 3,
        greatestAchievements: "Regionals Top 16",
      },
    },
    entryRound,
  });

  await drop(offered, "Server verlassen");
  await createOffer({
    windowId: input.windowId,
    replacedUserId: offered,
    replacementUserId: newcomers[1].id,
    offeredById: input.staffId,
    entryRound: Math.min(input.currentRound, input.totalRounds),
  });
}

export async function generateSeedData(
  count: number,
  opts: {
    // Everyone placed and grouped, post-season rules still unset.
    grouped?: boolean;
    finalize?: boolean;
    schedule?: boolean;
    // Schedule generated but not yet published (schedule_hidden) — the staff
    // "Pairings veröffentlichen" flow. Implies finalize; ignored when
    // `schedule` is set.
    unpublishedSchedule?: boolean;
    includeUserId?: string;
    size?: number;
    divisionCount?: number;
    // Exact league shape. When set it dictates the registration count too —
    // the slices only come out even at `sum(groups) × size` players, so `count`
    // is ignored rather than silently reshaping the divisions.
    shape?: DevSeedingShape;
  } = {},
): Promise<{ windowId: string; staffId: string }> {
  // A schedule needs a finalized seeding to build from.
  const finalize = opts.finalize || opts.schedule || opts.unpublishedSchedule;
  await clearSeedData();

  const shape: DevSeedingShape = opts.shape ?? {
    divisionCount: opts.divisionCount ?? 2,
    size: opts.size ?? 8,
  };
  const shapeCount = shape.groupsPerDivision
    ? devShapePlayerCount(shape.groupsPerDivision, shape.size) -
      (opts.includeUserId ? 1 : 0)
    : count;

  const specs = buildSeedRegistrations(shapeCount);
  const ids: string[] = specs.map(() => randomUUID());

  // Fake accounts (one multi-row insert), then their profiles.
  await insertSeedUsers(
    specs.map((_, i) => ({
      id: ids[i],
      discordId: seedDiscordId(1, i),
    })),
  );
  // Profile mix. `has_capture_card` can only be true because the owner saved
  // their settings, so the seed keeps that invariant: a player who never
  // touched their profile is always `false`, and that `false` means "unknown",
  // not "owns none". All three states the MotW picker distinguishes therefore
  // occur — roughly a quarter never filled anything in, and of the rest two
  // thirds own a capture card.
  const editedAt = new Date();
  await db.insert(profiles).values(
    specs.map((spec, i) => {
      const untouched = i % 4 === 3;
      // Membership mix on its own cadence, so all combinations occur: every
      // fifth player was never checked (null — the fail-open state), the rest
      // are members except the occasional confirmed leaver, so the staff
      // section shows both buckets and the roster stamp at scale.
      const membershipUnknown = i % 5 === 4;
      return {
        userId: ids[i],
        displayName: spec.displayName,
        username: spec.username,
        hasCaptureCard: !untouched && i % 3 !== 2,
        settingsEditedAt: untouched ? null : editedAt,
        guildMember: membershipUnknown ? null : i % 9 !== 3,
        guildMemberCheckedAt: membershipUnknown ? null : editedAt,
      };
    }),
  );

  // A staff member: opens the window and is the "besprochen mit" contact on
  // player-reported free wins. Not registered — staff don't play the season.
  const staffId = randomUUID();
  await insertSeedUsers([{ id: staffId, discordId: seedDiscordId(3, 0) }]);
  await db.insert(profiles).values({
    userId: staffId,
    displayName: "Orga Team",
    username: "orga",
    role: "staff",
  });
  await seedBans(staffId);

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
      greatestAchievements: spec.greatestAchievements,
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
        greatestAchievements: "Top 8 bei der Bundesliga-Endrunde Saison 8",
      })
      .onConflictDoNothing();
  }

  if (finalize) {
    await finalizeDevSeeding(window.id, shape);
  } else if (opts.grouped) {
    await groupDevSeeding(window.id, shape);
  }
  if (opts.schedule) {
    await generateDevSchedule(window.id);
    await seedDevResults(window.id, staffId);
  } else if (opts.unpublishedSchedule) {
    await generateDevSchedule(window.id, false);
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
  await saveReplayRequirement(windowId, 2);
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

// The day `days` after (or before) an ISO date.
function shiftIso(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

// The last Sunday before today, and the Sunday that ends this week.
function lastSunday(today: string): string {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  return shiftIso(today, -(dow === 0 ? 7 : dow));
}

// A dev result: a best-of-3 with its winner, or a double loss.
type DevResult =
  | { kind: "normal"; winner: string; sweep: boolean }
  | { kind: "double_loss" };

// Writes many results at once, the way a player report stores them.
async function insertResultsBatch(
  rows: { matchId: string; a: string; b: string; result: DevResult }[],
): Promise<void> {
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    await db.insert(matchResults).values(
      chunk.map(({ matchId, a, result }) => ({
        matchId,
        outcome: result.kind,
        winnerId: result.kind === "normal" ? result.winner : null,
        platform: result.kind === "normal" ? ("showdown" as const) : null,
        reportedById: a,
      })),
    );
    const played = chunk.flatMap((row) =>
      row.result.kind === "normal" ? [{ ...row, result: row.result }] : [],
    );
    if (played.length === 0) {
      continue;
    }
    await db.insert(teamSheets).values(
      played.flatMap(({ matchId, a, b }) => [
        { matchId, playerId: a, source: "import" as const, ots: SEED_SHEET_A },
        {
          matchId,
          playerId: b,
          source: "pokepaste" as const,
          ots: SEED_SHEET_B,
        },
      ]),
    );
    await db.insert(matchGames).values(
      played.flatMap(({ matchId, a, b, result }) => {
        const loser = result.winner === a ? b : a;
        const games = result.sweep
          ? [result.winner, result.winner]
          : [result.winner, loser, result.winner];
        return games.map((w, n) => ({
          matchId,
          gameNumber: n + 1,
          winnerId: w,
          replayUrl: `https://replay.pokemonshowdown.com/seed-${n + 1}`,
        }));
      }),
    );
  }
}

// The regular matches of a season with their group, for writing results.
async function regularMatchesOf(windowId: string) {
  return db
    .select({
      id: matches.id,
      round: matches.round,
      playerAId: regularPlayerAId,
      playerBId: matches.playerBId,
      subDivisionId: matches.subDivisionId,
      tier: divisions.tier,
      position: subDivisions.position,
    })
    .from(matches)
    .innerJoin(subDivisions, eq(subDivisions.id, matches.subDivisionId))
    .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .where(and(eq(divisions.windowId, windowId), isNotNull(matches.playerBId)))
    .orderBy(asc(matches.round), asc(matches.id));
}

// Shared places at zone boundaries, by group (tier, group position): who
// ends level, so publishing has tiebreakers and a staff order to show
// (docs/plans/relegation-and-playoffs.md).
//   two-way at index i: the players on places i+1 and i+2 lose their match
//     to each other as a double loss and otherwise score alike.
//   three-way at the bottom: places 6 to 8 beat each other in a circle.
type DevTie = { kind: "two_way"; index: number } | { kind: "three_way_bottom" };
const DEV_TIES: { tier: number; position: number; tie: DevTie }[] = [
  // Division 1a, places 2 and 3: the Playoff boundary.
  { tier: 1, position: 0, tie: { kind: "two_way", index: 1 } },
  // Division 2a, places 1 and 2: the Relegation seat.
  { tier: 2, position: 0, tie: { kind: "two_way", index: 0 } },
  // Division 3a, places 6 to 8: the Relegation seat, a staff order.
  { tier: 3, position: 0, tie: { kind: "three_way_bottom" } },
];

// The result of every regular match. Each group has a fixed order (the
// persona first, then by id) and the better player always wins, so no two
// players of a group end level unless a tie is planned (`DEV_TIES`). Whether
// a match ends 2:0 or 2:1 depends on the group's position (2:0 when the two
// are at most `position` places apart), so no player matches the game tally
// of the same place in another group either, which keeps a Gesamttabelle
// free of ties as well.
function devRegularResults(
  all: Awaited<ReturnType<typeof regularMatchesOf>>,
  personaId: string | undefined,
  ties: boolean,
): { matchId: string; a: string; b: string; result: DevResult }[] {
  const tieOf = (tier: number, position: number) =>
    ties
      ? (DEV_TIES.find((t) => t.tier === tier && t.position === position)
          ?.tie ?? null)
      : null;
  const orderBySub = new Map<string, Map<string, number>>();
  for (const match of all) {
    const sub = match.subDivisionId as string;
    if (orderBySub.has(sub)) {
      continue;
    }
    const players = [
      ...new Set(
        all
          .filter((m) => m.subDivisionId === sub)
          .flatMap((m) => [m.playerAId, m.playerBId as string]),
      ),
    ].sort((x, y) =>
      x === personaId ? -1 : y === personaId ? 1 : x.localeCompare(y),
    );
    orderBySub.set(sub, new Map(players.map((id, i) => [id, i])));
  }

  return all.map((match) => {
    const a = match.playerAId;
    const b = match.playerBId as string;
    const order = orderBySub.get(match.subDivisionId as string);
    const ia = order?.get(a) ?? 0;
    const ib = order?.get(b) ?? 0;
    const [hi, lo] = ia < ib ? [ia, ib] : [ib, ia];
    const tie = tieOf(match.tier, match.position);
    if (tie?.kind === "two_way" && hi === tie.index && lo === tie.index + 1) {
      return { matchId: match.id, a, b, result: { kind: "double_loss" } };
    }
    // The circle: place 8 beats place 6.
    const upset = tie?.kind === "three_way_bottom" && hi === 5 && lo === 7;
    const better = ia < ib ? a : b;
    const worse = better === a ? b : a;
    return {
      matchId: match.id,
      a,
      b,
      result: {
        kind: "normal",
        winner: upset ? worse : better,
        sweep: !tie && lo - hi <= match.position,
      },
    };
  });
}

// A season whose regular part is over: every Spieltag ended by last Sunday,
// every regular match played, the schedule for Relegation und Playoffs
// created with its first week running now, nothing published yet. The
// staff's "Relegation und Playoffs veröffentlichen" is the next step
// (docs/plans/relegation-and-playoffs.md). The signed-in persona plays in
// Division 1 and wins every match, so their dashboard shows the Playoffs.
// With `ties`, some groups end level at a zone boundary (`DEV_TIES`).
export async function generateAfterSeasonSeed(
  includeUserId?: string,
  opts: { ties?: boolean } = {},
): Promise<void> {
  const { windowId } = await generateSeedData(0, {
    finalize: true,
    includeUserId,
    shape: DEV_SEASON_SHAPE,
  });
  if (includeUserId) {
    await moveIntoTopGroup(windowId, includeUserId);
  }

  const today = new Date().toISOString().slice(0, 10);
  const closedOn = lastSunday(today);
  await generateDevSchedule(windowId, true, (count) =>
    shiftIso(closedOn, -7 * count),
  );
  await insertResultsBatch(
    devRegularResults(
      await regularMatchesOf(windowId),
      includeUserId,
      opts.ties ?? false,
    ),
  );

  const shape = await divisionsWithGroupSizes(windowId);
  const days = await matchdaysForWindow(windowId);
  const last = days[days.length - 1];
  if (!last) {
    return;
  }
  const weeks = relegationPlayoffsWeeks(shape);
  const deadlines = Array.from({ length: weeks }, (_, i) =>
    shiftIso(last.endsOn, 7 * (i + 1)),
  );
  await persistRelegationPlayoffsSchedule({
    windowId,
    firstRound: last.round + 1,
    windows: windowsFromDeadlines(dayAfter(last.endsOn), deadlines),
    matchRows: relegationPlayoffsMatches(shape),
  });
}

// A season in its second-to-last Spieltag: the earlier ones played, the
// running one half, the last one open, and the schedule for Relegation und
// Playoffs not created yet, so staff can create it and watch the preview
// move while results come in. One finished match of the previous Spieltag is
// still held for a recording, an open point of the publish checklist. The
// persona leads a Division 1 group.
export async function generateLateRegularSeasonSeed(
  includeUserId?: string,
): Promise<void> {
  const { windowId, staffId } = await generateSeedData(0, {
    finalize: true,
    includeUserId,
    shape: DEV_SEASON_SHAPE,
  });
  if (includeUserId) {
    await moveIntoTopGroup(windowId, includeUserId);
  }

  // The second-to-last Spieltag ends this Sunday.
  const today = new Date().toISOString().slice(0, 10);
  const thisSunday = shiftIso(lastSunday(today), 7);
  await generateDevSchedule(windowId, true, (count) =>
    shiftIso(thisSunday, -7 * (count - 1)),
  );

  const all = await regularMatchesOf(windowId);
  const days = await matchdaysForWindow(windowId);
  const running = days.length - 1;
  const results = devRegularResults(all, includeUserId, false).filter(
    (_, i) =>
      all[i].round < running || (all[i].round === running && i % 2 === 0),
  );
  await insertResultsBatch(results);

  const held = all.find(
    (match) =>
      match.round === running - 1 &&
      match.playerAId !== includeUserId &&
      match.playerBId !== includeUserId,
  );
  if (held) {
    await db.insert(recordingHolds).values({
      matchId: held.id,
      windowId,
      round: held.round,
      heldById: staffId,
      motwRole: null,
    });
  }
}

// Swaps a player into the first group of Division 1, with whoever sat there
// first taking their place.
async function moveIntoTopGroup(
  windowId: string,
  userId: string,
): Promise<void> {
  const [top] = await db
    .select({ id: subDivisions.id })
    .from(subDivisions)
    .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .where(and(eq(divisions.windowId, windowId), eq(divisions.tier, 1)))
    .orderBy(asc(subDivisions.position))
    .limit(1);
  const [own] = await db
    .select({ subDivisionId: placements.subDivisionId })
    .from(placements)
    .where(
      and(eq(placements.windowId, windowId), eq(placements.userId, userId)),
    );
  if (!top || !own || own.subDivisionId === top.id) {
    return;
  }
  const [other] = await db
    .select({ userId: placements.userId })
    .from(placements)
    .where(
      and(
        eq(placements.windowId, windowId),
        eq(placements.subDivisionId, top.id),
      ),
    )
    .limit(1);
  if (!other) {
    return;
  }
  const [mine] = await db
    .select()
    .from(placements)
    .where(
      and(eq(placements.windowId, windowId), eq(placements.userId, userId)),
    );
  const [theirs] = await db
    .select()
    .from(placements)
    .where(
      and(
        eq(placements.windowId, windowId),
        eq(placements.userId, other.userId),
      ),
    );
  if (!mine || !theirs) {
    return;
  }
  await db
    .update(placements)
    .set({ divisionId: theirs.divisionId, subDivisionId: theirs.subDivisionId })
    .where(
      and(eq(placements.windowId, windowId), eq(placements.userId, userId)),
    );
  await db
    .update(placements)
    .set({ divisionId: mine.divisionId, subDivisionId: mine.subDivisionId })
    .where(
      and(
        eq(placements.windowId, windowId),
        eq(placements.userId, other.userId),
      ),
    );
}
