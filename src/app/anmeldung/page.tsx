import { SiteHeader } from "@/components/site-header";
import { SignInButton } from "@/features/auth/components/sign-in-button";
import { getProfile } from "@/features/profile/queries";
import { ProfileHint } from "@/features/registration/components/profile-hint";
import { RegistrationConfirmation } from "@/features/registration/components/registration-confirmation";
import { RegistrationForm } from "@/features/registration/components/registration-form";
import {
  getRegistration,
  priorRegistrationCount,
} from "@/features/registration/queries";
import { shouldShowProfileHint } from "@/features/registration/registration";
import { currentUser } from "@/features/roles/guard";
import { latestWindow } from "@/features/staff/queries";
import {
  type RegistrationState,
  registrationState,
  seasonName,
} from "@/features/staff/registration-window";
import { cn } from "@/lib/utils";

function formatDeadline(closesAt: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(closesAt);
}

function statusLine(
  state: RegistrationState,
  closesAt: Date | null,
  season: string,
): string {
  if (state === "open" && closesAt) {
    return `${season} · Läuft bis ${formatDeadline(closesAt)}`;
  }
  if (state === "closed") {
    return `${season} · Geschlossen`;
  }
  return "Noch nicht geöffnet";
}

function Shell({
  state,
  closesAt,
  season,
  children,
}: {
  state: RegistrationState;
  closesAt: Date | null;
  season: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="mb-2.5 text-4xl text-brand-blue dark:text-white">
          Anmeldung
        </h1>
        <div className="mb-9 flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-4 -skew-x-[18deg]",
              state === "open" ? "bg-brand-orange" : "bg-border",
            )}
          />
          <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
            {statusLine(state, closesAt, season)}
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}

function Message({ text }: { text: string }) {
  return <p className="text-muted-foreground">{text}</p>;
}

export default async function AnmeldungPage() {
  const window = await latestWindow();
  const state = window ? registrationState(window, new Date()) : "not_started";
  const closesAt = window?.closesAt ?? null;
  const seasonLabel = window ? seasonName(window.seasonNumber) : "";
  const current = await currentUser();

  if (!current) {
    return (
      <Shell state={state} closesAt={closesAt} season={seasonLabel}>
        <div className="flex flex-col items-start gap-4">
          <Message text="Melde dich mit Discord an, um an der nächsten Saison teilzunehmen." />
          <SignInButton size="lg" />
        </div>
      </Shell>
    );
  }

  if (state === "not_started" || !window) {
    return (
      <Shell state={state} closesAt={closesAt} season={seasonLabel}>
        <Message text="Die Anmeldung für die nächste Saison ist noch nicht geöffnet." />
      </Shell>
    );
  }

  const registration = await getRegistration(window.id, current.userId);
  if (registration) {
    return (
      <Shell state={state} closesAt={closesAt} season={seasonLabel}>
        <RegistrationConfirmation
          data={registration}
          seasonName={seasonLabel}
          canWithdraw={state === "open"}
          closesAt={closesAt}
        />
      </Shell>
    );
  }

  if (state === "closed") {
    return (
      <Shell state={state} closesAt={closesAt} season={seasonLabel}>
        <Message text="Die Anmeldung ist geschlossen. Die nächste Chance kommt — schau im Discord vorbei." />
      </Shell>
    );
  }

  const [detectedReturning, profile] = await Promise.all([
    priorRegistrationCount(window.id, current.userId).then((n) => n > 0),
    getProfile(current.userId),
  ]);

  return (
    <Shell state={state} closesAt={closesAt} season={seasonLabel}>
      <div className="flex flex-col gap-8">
        {shouldShowProfileHint(profile) ? <ProfileHint /> : null}
        <RegistrationForm
          displayName={current.displayName}
          detectedReturning={detectedReturning}
        />
      </div>
    </Shell>
  );
}
