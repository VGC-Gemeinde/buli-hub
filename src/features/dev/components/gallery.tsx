"use client";

import { SignInButton } from "@/features/auth/components/sign-in-button";
import { UserMenu } from "@/features/auth/components/user-menu";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { SaveIndicator } from "@/features/profile/components/settings-form";
import { ProfileHint } from "@/features/registration/components/profile-hint";
import { RegistrationConfirmation } from "@/features/registration/components/registration-confirmation";
import { DisputeDialog } from "@/features/reporting/components/dispute-dialog";
import { DisputeResolveDialog } from "@/features/reporting/components/dispute-resolve-dialog";
import { ReportSummary } from "@/features/reporting/components/report-summary";
import { SaisonDashboard } from "@/features/reporting/components/saison-dashboard";
import { StaffResultEditor } from "@/features/reporting/components/staff-result-editor";
import type {
  DisputeRow,
  MatchResultLite,
  StaffMatchRow,
  StoredResult,
} from "@/features/reporting/queries";
import type { StandingsRow } from "@/features/reporting/standings";
import { CreateScheduleDialog } from "@/features/schedule/components/create-schedule-dialog";
import { defaultDeadlines } from "@/features/schedule/spieltage";
import {
  ComingSoonPanel,
  RegisterCtaPanel,
  SeasonMessagePanel,
} from "@/features/season/components/pre-season";
import { InSeasonDashboard } from "@/features/season/components/season-dashboard";
import type { PlayerMatch } from "@/features/season/dashboard";
import { ControlBar } from "@/features/seeding/components/control-bar";
import { FinalizeDialog } from "@/features/seeding/components/finalize-dialog";
import { PostSeasonDialog } from "@/features/seeding/components/post-season-dialog";
import { SeedingSheet } from "@/features/seeding/components/seeding-sheet";
import { SeedingInitLoader } from "@/features/seeding/components/seeding-workspace";
import type { SeedingPlayer } from "@/features/seeding/placement";
import { assignZones } from "@/features/seeding/post-season";
import type { DivisionWithGroupSizes } from "@/features/seeding/queries";
import { assembleSheetRows } from "@/features/seeding/sheet";
import { CopyLinkButton } from "@/features/staff/components/copy-link-button";
import {
  PlayerGrid,
  SeasonCard,
} from "@/features/staff/components/registration-status";
import type { RegistrationState } from "@/features/staff/registration-window";

const AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/1.png";

// Mock data for the Spieler-Dashboard specimen.
const DASH_TODAY = "2026-07-10";
const DASH_MATCHES: PlayerMatch[] = [
  {
    matchId: "m1",
    round: 1,
    startsOn: "2026-07-01",
    endsOn: "2026-07-07",
    opponent: { userId: "a", name: "Falinks", avatarUrl: null },
  },
  {
    matchId: "m2",
    round: 2,
    startsOn: "2026-07-08",
    endsOn: "2026-07-14",
    opponent: { userId: "b", name: "Wooloo", avatarUrl: AVATAR_URL },
  },
  {
    matchId: "m3",
    round: 3,
    startsOn: "2026-07-15",
    endsOn: "2026-07-21",
    opponent: { userId: "c", name: "Pawmi", avatarUrl: null },
  },
  {
    matchId: "m4",
    round: 4,
    startsOn: "2026-07-22",
    endsOn: "2026-07-28",
    opponent: null,
  },
];
const DASH_RESULTS = new Map<string, MatchResultLite>([
  [
    "m1",
    {
      matchId: "m1",
      outcome: "normal",
      winnerId: "me",
      confirmedAt: null,
      disputed: false,
      games: [{ winnerId: "me" }, { winnerId: "a" }, { winnerId: "me" }],
    },
  ],
]);
const SUMMARY_A = { userId: "me", name: "Testerino", avatarUrl: AVATAR_URL };
const SUMMARY_B = { userId: "opp", name: "Falinks", avatarUrl: null };
const SUMMARY_RESULT: StoredResult = {
  outcome: "normal",
  winnerId: "me",
  platform: "showdown",
  playerATeamUrl: "https://pokepast.es/aaaa",
  playerBTeamUrl: "https://pokepast.es/bbbb",
  videoUrl: null,
  freeWinReason: null,
  discussedWithId: null,
  discussedWithName: null,
  reportedById: "me",
  reportedAt: new Date("2026-07-06T18:00:00Z"),
  confirmedAt: null,
  games: [
    {
      gameNumber: 1,
      winnerId: "me",
      replayUrl: "https://replay.pokemonshowdown.com/x",
    },
    {
      gameNumber: 2,
      winnerId: "opp",
      replayUrl: "https://replay.pokemonshowdown.com/y",
    },
    {
      gameNumber: 3,
      winnerId: "me",
      replayUrl: "https://replay.pokemonshowdown.com/z",
    },
  ],
};
const FREEWIN_RESULT: StoredResult = {
  outcome: "free_win",
  winnerId: "me",
  platform: null,
  playerATeamUrl: null,
  playerBTeamUrl: null,
  videoUrl: null,
  freeWinReason: "Gegner war trotz mehrerer Terminvorschläge nicht erreichbar.",
  discussedWithId: "staff",
  discussedWithName: "Orga Team",
  reportedById: "me",
  reportedAt: new Date("2026-07-06T18:00:00Z"),
  confirmedAt: null,
  games: [],
};
const staffRow = (
  matchId: string,
  round: number,
  groupName: string,
  a: string,
  b: string,
  extra: Partial<StaffMatchRow> = {},
): StaffMatchRow => ({
  matchId,
  round,
  groupName,
  endsOn: "2026-07-07",
  playerA: { userId: `${matchId}a`, name: a, avatarUrl: null },
  playerB: { userId: `${matchId}b`, name: b, avatarUrl: null },
  outcome: null,
  winnerId: null,
  confirmedAt: null,
  freeWinReason: null,
  reporterName: null,
  reportedAt: null,
  dispute: null,
  ...extra,
});
const STAFF_OVERDUE = [staffRow("o1", 1, "Division 1a", "Falinks", "Wooloo")];
const STAFF_WEEK = [
  staffRow("w1", 2, "Division 1a", "Pawmi", "Mika"),
  staffRow("w2", 2, "Division 1b", "Nico", "Luca", {
    outcome: "normal",
    winnerId: "w2a",
  }),
];
const STAFF_PENDING = [
  staffRow("p1", 1, "Division 2a", "Finn", "Jonas", {
    outcome: "free_win",
    winnerId: "p1a",
    freeWinReason: "Gegner war trotz mehrerer Anfragen nicht erreichbar.",
    reporterName: "Finn",
    reportedAt: new Date("2026-07-06T18:00:00Z"),
  }),
];
const STAFF_DISPUTED = [
  staffRow("d1", 2, "Division 1b", "Sora", "Kai", {
    outcome: "normal",
    winnerId: "d1a",
    dispute: {
      reason: "Spiel 2 ging an mich, nicht an Sora.",
      openedByName: "Kai",
      openedAt: new Date("2026-07-08T20:00:00Z"),
    },
  }),
];
const STAFF_RESOLVED: DisputeRow[] = [
  {
    matchId: "r1",
    round: 1,
    groupName: "Division 2b",
    playerA: { userId: "r1a", name: "Emil", avatarUrl: null },
    playerB: { userId: "r1b", name: "Ben", avatarUrl: null },
    reason: "Falscher Sieger gemeldet.",
    openedByName: "Ben",
    openedAt: new Date("2026-07-02T18:00:00Z"),
    resolution: "corrected",
    resolvedAt: new Date("2026-07-03T09:00:00Z"),
  },
  {
    matchId: "r2",
    round: 1,
    groupName: "Division 1a",
    playerA: { userId: "r2a", name: "Lea", avatarUrl: null },
    playerB: { userId: "r2b", name: "Tom", avatarUrl: null },
    reason: "Replay-Link stimmt nicht.",
    openedByName: "Lea",
    openedAt: new Date("2026-07-01T18:00:00Z"),
    resolution: "upheld",
    resolvedAt: new Date("2026-07-02T11:00:00Z"),
  },
];
const EDITOR_INITIAL = {
  platform: "showdown" as const,
  games: [
    { winnerId: "ea", replayUrl: "https://replay.pokemonshowdown.com/gen9-1" },
    { winnerId: "eb", replayUrl: "https://replay.pokemonshowdown.com/gen9-2" },
    { winnerId: "ea", replayUrl: "https://replay.pokemonshowdown.com/gen9-3" },
  ],
  playerATeamUrl: "https://pokepast.es/aaaaaaaaaaaaaaaa",
  playerBTeamUrl: "https://pokepast.es/bbbbbbbbbbbbbbbb",
  videoUrl: null,
};
const EDITOR_A = { userId: "ea", name: "Sora", avatarUrl: null };
const EDITOR_B = { userId: "eb", name: "Kai", avatarUrl: null };
// Builds a userId → zone map for a standings fixture, so the specimens show the
// post-season tints without a real config.
const zoneMap = (
  rows: StandingsRow[],
  counts: {
    champion?: number;
    promotions: number;
    promotionPlayoff: number;
    demotionPlayoff: number;
    demotions: number;
  },
) =>
  new Map(
    assignZones({ rowCount: rows.length, ...counts }).map((zone, i) => [
      rows[i].userId,
      zone,
    ]),
  );

// A balanced three-tier config (equal groups) for the post-season dialog.
const POST_SEASON_DIVISIONS: DivisionWithGroupSizes[] = [
  {
    id: "d1",
    tier: 1,
    relevantTable: "sub_division",
    guaranteedPromotions: 0,
    guaranteedDemotions: 1,
    promotionPlayoffSlots: 0,
    demotionPlayoffSlots: 1,
    championshipPlayoffSlots: 2,
    groupSizes: [8, 8],
  },
  {
    id: "d2",
    tier: 2,
    relevantTable: "division", // Gesamttabelle — per-division counts, 16 places
    guaranteedPromotions: 2,
    guaranteedDemotions: 2,
    promotionPlayoffSlots: 2,
    demotionPlayoffSlots: 2,
    championshipPlayoffSlots: 0,
    groupSizes: [8, 8],
  },
  {
    id: "d3",
    tier: 3,
    relevantTable: "sub_division",
    guaranteedPromotions: 1,
    guaranteedDemotions: 0,
    promotionPlayoffSlots: 1,
    demotionPlayoffSlots: 0,
    championshipPlayoffSlots: 0,
    groupSizes: [8, 8],
  },
];

// Unequal small groups with too many spots — exercises the overbooked stripe and
// an unbalanced seam.
const POST_SEASON_OVERBOOKED: DivisionWithGroupSizes[] = [
  {
    id: "o1",
    tier: 1,
    relevantTable: "sub_division",
    guaranteedPromotions: 0,
    guaranteedDemotions: 3,
    promotionPlayoffSlots: 0,
    demotionPlayoffSlots: 2, // 5 demote spots in a group of 4 → overbooked
    championshipPlayoffSlots: 0,
    groupSizes: [4, 4],
  },
  {
    id: "o2",
    tier: 2,
    relevantTable: "sub_division",
    guaranteedPromotions: 1,
    guaranteedDemotions: 0,
    promotionPlayoffSlots: 1,
    demotionPlayoffSlots: 0, // promotes 2, but o1 demotes 6 → unbalanced
    championshipPlayoffSlots: 0,
    groupSizes: [4, 4],
  },
];

const DASH_STANDINGS: StandingsRow[] = [
  {
    userId: "me",
    name: "Testerino",
    avatarUrl: AVATAR_URL,
    wins: 1,
    losses: 0,
    points: 3,
    gamesWon: 2,
    gamesLost: 0,
    rank: 1,
  },
  {
    userId: "a",
    name: "Falinks",
    avatarUrl: null,
    wins: 0,
    losses: 1,
    points: 0,
    gamesWon: 0,
    gamesLost: 2,
    rank: 2,
  },
  // b and c are genuinely tied (no games played) → shared rank 3, no rank 4.
  {
    userId: "b",
    name: "Wooloo",
    avatarUrl: AVATAR_URL,
    wins: 0,
    losses: 0,
    points: 0,
    gamesWon: 0,
    gamesLost: 0,
    rank: 3,
  },
  {
    userId: "c",
    name: "Pawmi",
    avatarUrl: null,
    wins: 0,
    losses: 0,
    points: 0,
    gamesWon: 0,
    gamesLost: 0,
    rank: 3,
  },
];
// The whole division (groups 1a + 1b, equal size) merged into one table — the
// division view of the switcher. "me" ranks mid-table among the other group.
const DASH_DIVISION_STANDINGS: StandingsRow[] = [
  {
    userId: "d",
    name: "Grafaiai",
    avatarUrl: null,
    wins: 1,
    losses: 0,
    points: 3,
    gamesWon: 2,
    gamesLost: 1,
    rank: 1,
  },
  {
    userId: "me",
    name: "Testerino",
    avatarUrl: AVATAR_URL,
    wins: 1,
    losses: 0,
    points: 3,
    gamesWon: 2,
    gamesLost: 0,
    rank: 1,
  },
  {
    userId: "e",
    name: "Kilowattrel",
    avatarUrl: null,
    wins: 1,
    losses: 0,
    points: 3,
    gamesWon: 2,
    gamesLost: 0,
    rank: 1,
  },
  {
    userId: "a",
    name: "Falinks",
    avatarUrl: null,
    wins: 0,
    losses: 1,
    points: 0,
    gamesWon: 0,
    gamesLost: 2,
    rank: 4,
  },
  {
    userId: "f",
    name: "Maushold",
    avatarUrl: null,
    wins: 0,
    losses: 1,
    points: 0,
    gamesWon: 0,
    gamesLost: 2,
    rank: 4,
  },
  {
    userId: "b",
    name: "Wooloo",
    avatarUrl: AVATAR_URL,
    wins: 0,
    losses: 0,
    points: 0,
    gamesWon: 0,
    gamesLost: 0,
    rank: 6,
  },
  {
    userId: "c",
    name: "Pawmi",
    avatarUrl: null,
    wins: 0,
    losses: 0,
    points: 0,
    gamesWon: 0,
    gamesLost: 0,
    rank: 6,
  },
  {
    userId: "g",
    name: "Tinkatink",
    avatarUrl: null,
    wins: 0,
    losses: 0,
    points: 0,
    gamesWon: 0,
    gamesLost: 0,
    rank: 6,
  },
];

// Identity variants exercise the name/username/avatar fallbacks and, via
// roleLabel, all four role badges.
const IDENTITIES: {
  label: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  roleLabel: string;
}[] = [
  {
    label: "Avatar + Name",
    displayName: "Testerino",
    username: "testerino",
    avatarUrl: AVATAR_URL,
    roleLabel: "Admin",
  },
  {
    label: "Ohne Avatar",
    displayName: "Ohne Avatar",
    username: "ohne_avatar",
    avatarUrl: null,
    roleLabel: "Staff",
  },
  {
    label: "Langer Name",
    displayName: "Blaubeerkuchenbäckermeisterin Annegret III.",
    username: "annegret",
    avatarUrl: AVATAR_URL,
    roleLabel: "Dev",
  },
  {
    label: "Leere Metadaten",
    displayName: null,
    username: null,
    avatarUrl: null,
    roleLabel: "Spieler",
  },
];

const SAVE_STATES = ["idle", "saving", "saved", "error"] as const;

function Specimen({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function Gallery() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">ProfileHeader</h2>
        {IDENTITIES.map(
          ({ label, displayName, username, avatarUrl, roleLabel }) => (
            <Specimen key={label} label={label}>
              {/* max-w mirrors the /profil column so truncation is visible */}
              <div className="max-w-xl">
                <ProfileHeader
                  displayName={displayName}
                  username={username}
                  avatarUrl={avatarUrl}
                  roleLabel={roleLabel}
                />
              </div>
            </Specimen>
          ),
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">UserMenu</h2>
        <div className="grid grid-cols-2 gap-3">
          {IDENTITIES.slice(0, 2).map(({ label, displayName, avatarUrl }) => (
            <Specimen key={label} label={label}>
              <div className="flex justify-start">
                <UserMenu displayName={displayName} avatarUrl={avatarUrl} />
              </div>
            </Specimen>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">SignInButton</h2>
        <div className="grid grid-cols-3 gap-3">
          <Specimen label="default">
            <SignInButton />
          </Specimen>
          <Specimen label="outline (Header)">
            <SignInButton variant="outline" />
          </Specimen>
          <Specimen label="lg (Hero)">
            <SignInButton size="lg" />
          </Specimen>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">SaveIndicator</h2>
        <div className="grid grid-cols-4 gap-3">
          {SAVE_STATES.map((state) => (
            <Specimen key={state} label={state}>
              <div className="min-h-5">
                <SaveIndicator status={state} />
              </div>
            </Specimen>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Fehlermeldungen</h2>
        <Specimen label="Anmeldefehler (Landing, ?auth_error=1)">
          <p className="text-destructive text-sm">
            Anmeldung fehlgeschlagen. Bitte versuche es erneut.
          </p>
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Staff: Saison-Karte</h2>
        {(
          [
            ["not_started", null],
            ["open", new Date("2100-01-01T18:00:00Z")],
            ["closed", new Date("2000-01-01T18:00:00Z")],
          ] as [RegistrationState, Date | null][]
        ).map(([state, closesAt]) => (
          <Specimen key={state} label={state}>
            <SeasonCard
              state={state}
              registrationUrl="http://localhost:3000/anmeldung"
              closesAt={closesAt}
            />
          </Specimen>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Staff: Anmeldungs-Grid</h2>
        <Specimen label="leer">
          <PlayerGrid players={[]} />
        </Specimen>
        <Specimen label="mit Spielern">
          <PlayerGrid
            players={[
              { id: "1", name: "Testerino", avatarUrl: AVATAR_URL },
              { id: "2", name: "annegret" },
              { id: "3", name: "Blaubeerkuchen" },
            ]}
          />
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">CopyLinkButton</h2>
        <Specimen label="Anmeldelink">
          <CopyLinkButton url="http://localhost:3000/anmeldung" />
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Registrierung: Profil-Hinweis</h2>
        <Specimen label="Hinweis">
          <ProfileHint />
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Registrierung: Bestätigung</h2>
        <Specimen label="Neuer Spieler (mit Abmelden)">
          <RegistrationConfirmation
            canWithdraw
            closesAt={new Date("2100-01-01T18:00:00Z")}
            data={{
              platform: "showdown",
              prevSeason: null,
              prevName: null,
              prevDivision: null,
              prevPlacement: null,
              skillSelfRating: 4,
              greatestAchievements: "Top 16 Regional",
            }}
          />
        </Specimen>
        <Specimen label="Veteran (geschlossen, kein Abmelden)">
          <RegistrationConfirmation
            canWithdraw={false}
            closesAt={null}
            data={{
              platform: "cartridge",
              prevSeason: "Saison 4",
              prevName: "AltHase",
              prevDivision: 2,
              prevPlacement: 3,
              skillSelfRating: null,
              greatestAchievements: null,
            }}
          />
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Seeding: Sheet</h2>
        <Specimen label="Zeilen (Separatoren, Spieler, Gruppen)">
          <div className="flex h-[440px] flex-col overflow-hidden rounded-lg border">
            <SeedingSheet
              rows={assembleSheetRows({
                players: SEEDING_PLAYERS,
                divisions: SEEDING_DIVISIONS,
                subDivisions: SEEDING_SUBS,
                size: 8,
                filter: { query: "", status: "all" },
              })}
              divisions={SEEDING_DIVISIONS}
              subDivisions={SEEDING_SUBS}
              selection={new Set()}
              readOnly={false}
              generatingDivisionId={null}
              onGenerate={() => {}}
              onToggleSelect={() => {}}
              onAssignDivision={() => {}}
              onMoveGroup={() => {}}
              onPlace={() => {}}
            />
          </div>
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Seeding: Auto-Einteilung (Ladezustand)</h2>
        <Specimen label="Während die Rückkehrer eingeteilt werden">
          <div className="flex h-40 flex-col rounded-lg border">
            <SeedingInitLoader />
          </div>
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Seeding: Steuerung</h2>
        <Specimen label="Beobachter — niemand steuert">
          <ControlBar
            state="free"
            holderName={null}
            pending={false}
            onAcquire={() => {}}
            onRelease={() => {}}
          />
        </Specimen>
        <Specimen label="Beobachter — jemand steuert">
          <ControlBar
            state="held-by-other"
            holderName="Testerino"
            pending={false}
            onAcquire={() => {}}
            onRelease={() => {}}
          />
        </Specimen>
        <Specimen label="Du steuerst">
          <ControlBar
            state="self"
            holderName="Testerino"
            pending={false}
            onAcquire={() => {}}
            onRelease={() => {}}
          />
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Einteilung: Finalisieren</h2>
        <Specimen label="Bereit">
          <FinalizeDialog
            ready
            gateHint="Endgültig — kann nicht rückgängig gemacht werden."
            onConfirm={async () => ({ ok: true })}
          />
        </Specimen>
        <Specimen label="Gesperrt">
          <FinalizeDialog
            ready={false}
            gateHint="Erst wenn alle Spieler platziert und in Gruppen sind."
            onConfirm={async () => ({ ok: true })}
          />
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Einteilung: Auf- & Abstieg</h2>
        <Specimen label="Dialog — gültig (Gruppen- & Gesamttabelle, Seams ausgeglichen)">
          <PostSeasonDialog
            divisions={POST_SEASON_DIVISIONS}
            readOnly={false}
            configured
            onSave={async () => ({ ok: true, issues: [] })}
          />
        </Specimen>
        <Specimen label="Dialog — überbelegt & unausgeglichen (Fehlerzustände)">
          <PostSeasonDialog
            divisions={POST_SEASON_OVERBOOKED}
            readOnly={false}
            configured={false}
            onSave={async () => ({ ok: true, issues: [] })}
          />
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Spielplan: Erstellen</h2>
        <Specimen label="Dialog (Spielwochen-Deadlines)">
          <CreateScheduleDialog
            seasonStart="2026-07-01"
            defaultDeadlines={defaultDeadlines("2026-07-01", 7)}
            largest={8}
          />
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Spieler-Dashboard</h2>
        <Specimen label="Gesamttabelle (Division-Modus, Zonen: Auf-/Abstieg + Playoff)">
          <InSeasonDashboard
            groupName="Division 1a"
            currentRound={2}
            totalRounds={4}
            next={DASH_MATCHES[1]}
            matches={DASH_MATCHES}
            resultByMatchId={DASH_RESULTS}
            standings={DASH_STANDINGS}
            divisionName="Division 1"
            divisionStandings={DASH_DIVISION_STANDINGS}
            divisionZones={zoneMap(DASH_DIVISION_STANDINGS, {
              champion: 1,
              promotions: 1,
              promotionPlayoff: 1,
              demotionPlayoff: 1,
              demotions: 1,
            })}
            defaultScope="division"
            meId="me"
            today={DASH_TODAY}
          />
        </Specimen>
        <Specimen label="Gruppentabelle (Sub-Division-Modus, Zonen pro Gruppe)">
          <InSeasonDashboard
            groupName="Division 1a"
            currentRound={2}
            totalRounds={4}
            next={DASH_MATCHES[1]}
            matches={DASH_MATCHES}
            resultByMatchId={DASH_RESULTS}
            standings={DASH_STANDINGS}
            groupZones={zoneMap(DASH_STANDINGS, {
              promotions: 1,
              promotionPlayoff: 0,
              demotionPlayoff: 0,
              demotions: 1,
            })}
            divisionName="Division 1"
            divisionStandings={null}
            defaultScope="group"
            meId="me"
            today={DASH_TODAY}
          />
        </Specimen>
        <Specimen label="Vorsaison: keine Saison">
          <ComingSoonPanel />
        </Specimen>
        <Specimen label="Vorsaison: Anmeldung läuft (CTA)">
          <RegisterCtaPanel seasonName="Saison 1" />
        </Specimen>
        <Specimen label="Vorsaison: nicht dabei">
          <SeasonMessagePanel
            title="Du bist in der laufenden Saison nicht dabei"
            body="Für diese Saison liegt keine Einteilung für dich vor."
          />
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Match-Meldung: Ergebnis</h2>
        <Specimen label="Ergebnis (Sieg, Showdown, 2:1)">
          <ReportSummary
            result={SUMMARY_RESULT}
            playerA={SUMMARY_A}
            playerB={SUMMARY_B}
            viewerId="me"
            round={2}
            groupName="Division 1a"
          />
        </Specimen>
        <Specimen label="Freewin (wartet auf Staff)">
          <ReportSummary
            result={FREEWIN_RESULT}
            playerA={SUMMARY_A}
            playerB={SUMMARY_B}
            viewerId="me"
            round={3}
            groupName="Division 1a"
          />
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Staff: Saison-Dashboard</h2>
        <Specimen label="Worklist (überfällig · angefochten · diese Woche · Freewins)">
          <SaisonDashboard
            overdue={STAFF_OVERDUE}
            thisWeek={STAFF_WEEK}
            pendingFreeWins={STAFF_PENDING}
            disputed={STAFF_DISPUTED}
            resolvedDisputes={STAFF_RESOLVED}
            today="2026-07-10"
          />
        </Specimen>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">Disputes</h2>
        <Specimen label="Spieler: Ergebnis anfechten">
          <DisputeDialog matchId="demo" />
        </Specimen>
        <Specimen label="Staff: Anfechtung entscheiden">
          <DisputeResolveDialog matchId="demo" />
        </Specimen>
        <Specimen label="Staff: Ergebnis bearbeiten">
          <StaffResultEditor
            matchId="demo"
            playerA={EDITOR_A}
            playerB={EDITOR_B}
            initial={EDITOR_INITIAL}
          />
        </Specimen>
      </section>
    </div>
  );
}

const SEEDING_DIVISIONS = [
  { id: "d1", tier: 1 },
  { id: "d2", tier: 2 },
];
const SEEDING_SUBS = [
  { id: "s1", divisionId: "d1", position: 0 },
  { id: "s2", divisionId: "d1", position: 1 },
];

function seedPlayer(overrides: Partial<SeedingPlayer>): SeedingPlayer {
  return {
    userId: crypto.randomUUID(),
    displayName: "Spieler",
    username: "spieler",
    avatarUrl: null,
    status: "new",
    platform: "showdown",
    participatedBefore: false,
    skillSelfRating: 5,
    prevSeason: null,
    prevName: null,
    prevDivision: null,
    prevPlacement: null,
    greatestAchievements: null,
    divisionId: null,
    subDivisionId: null,
    ...overrides,
  };
}

const SEEDING_PLAYERS: SeedingPlayer[] = [
  seedPlayer({
    displayName: "AltHase",
    status: "returning",
    platform: "cartridge",
    participatedBefore: true,
    skillSelfRating: null,
    prevSeason: "Saison 4",
    prevDivision: 1,
    prevPlacement: 2,
  }),
  seedPlayer({ displayName: "Neuling", skillSelfRating: 8 }),
  seedPlayer({
    displayName: "Kuro",
    divisionId: "d1",
    subDivisionId: "s1",
    skillSelfRating: 9,
  }),
  seedPlayer({
    displayName: "Annegret",
    divisionId: "d1",
    subDivisionId: "s2",
    platform: "cartridge",
  }),
];
