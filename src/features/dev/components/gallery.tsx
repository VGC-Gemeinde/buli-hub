import { SignInButton } from "@/features/auth/components/sign-in-button";
import { UserMenu } from "@/features/auth/components/user-menu";
import type { DiscordIdentity } from "@/features/auth/identity";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { SaveIndicator } from "@/features/profile/components/settings-form";

const AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/1.png";

const IDENTITIES: { label: string; identity: DiscordIdentity }[] = [
  {
    label: "Avatar + Name",
    identity: {
      discordId: "1",
      displayName: "Testerino",
      avatarUrl: AVATAR_URL,
    },
  },
  {
    label: "Ohne Avatar",
    identity: { discordId: "2", displayName: "Ohne Avatar", avatarUrl: null },
  },
  {
    label: "Langer Name",
    identity: {
      discordId: "3",
      displayName: "Blaubeerkuchenbäckermeisterin Annegret III.",
      avatarUrl: AVATAR_URL,
    },
  },
  {
    label: "Leere Metadaten",
    identity: { discordId: null, displayName: null, avatarUrl: null },
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
        {IDENTITIES.map(({ label, identity }) => (
          <Specimen key={label} label={label}>
            {/* max-w mirrors the /profil column so truncation is visible */}
            <div className="max-w-xl">
              <ProfileHeader identity={identity} />
            </div>
          </Specimen>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl">UserMenu</h2>
        <div className="grid grid-cols-2 gap-3">
          {IDENTITIES.slice(0, 2).map(({ label, identity }) => (
            <Specimen key={label} label={label}>
              <div className="flex justify-start">
                <UserMenu identity={identity} />
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
    </div>
  );
}
