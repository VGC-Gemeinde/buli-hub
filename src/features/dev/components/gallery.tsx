import { SignInButton } from "@/features/auth/components/sign-in-button";
import { UserMenu } from "@/features/auth/components/user-menu";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { SaveIndicator } from "@/features/profile/components/settings-form";
import { ProfileHint } from "@/features/registration/components/profile-hint";
import { RegistrationConfirmation } from "@/features/registration/components/registration-confirmation";
import { CreateScheduleDialog } from "@/features/schedule/components/create-schedule-dialog";
import { defaultDeadlines } from "@/features/schedule/spieltage";
import { FinalizeDialog } from "@/features/seeding/components/finalize-dialog";
import { SeedingSheet } from "@/features/seeding/components/seeding-sheet";
import { SeedingInitLoader } from "@/features/seeding/components/seeding-workspace";
import type { SeedingPlayer } from "@/features/seeding/placement";
import { assembleSheetRows } from "@/features/seeding/sheet";
import { CopyLinkButton } from "@/features/staff/components/copy-link-button";
import {
  PlayerGrid,
  SeasonCard,
} from "@/features/staff/components/registration-status";
import type { RegistrationState } from "@/features/staff/registration-window";

const AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/1.png";

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
        <h2 className="text-2xl">Spielplan: Erstellen</h2>
        <Specimen label="Dialog (Spielwochen-Deadlines)">
          <CreateScheduleDialog
            seasonStart="2026-07-01"
            defaultDeadlines={defaultDeadlines("2026-07-01", 7)}
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
