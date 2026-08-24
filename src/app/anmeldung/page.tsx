import { Info } from "lucide-react";
import { EmptyStateCard } from "@/components/empty-state-card";
import { SiteHeader } from "@/components/site-header";
import { Tick } from "@/components/tick";
import { SignInButton } from "@/features/auth/components/sign-in-button";
import { MembershipBlockedCard } from "@/features/membership/components/blocked-card";
import { isConfirmedNonMember } from "@/features/membership/membership";
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
import { formatGermanDateTime } from "@/lib/german-time";

// Reads the live registration window on every request — never prerender at
// build time (the image build has no database).
export const dynamic = "force-dynamic";

// Short deadline, e.g. "15.08.26, 20:00" — used in the status line and inline
// next to the sign-in CTA.
function formatDeadline(closesAt: Date): string {
  return formatGermanDateTime(closesAt, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Long, spelled-out timestamp, e.g. "15. August 2026, 20:00" — used on the
// closed card.
function formatLongTimestamp(date: Date): string {
  return formatGermanDateTime(date, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
          <Tick size="s" color={state === "open" ? "orange" : "neutral"} />
          <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
            {statusLine(state, closesAt, season)}
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}

export default async function AnmeldungPage() {
  const window = await latestWindow();
  const state = window ? registrationState(window, new Date()) : "not_started";
  const closesAt = window?.closesAt ?? null;
  const seasonLabel = window ? seasonName(window.seasonNumber) : "";
  const current = await currentUser();

  // Signed out while the registration is open: the sign-in is the primary
  // action (it is also the registration entry point).
  if (!current && state === "open" && window) {
    return (
      <Shell state={state} closesAt={closesAt} season={seasonLabel}>
        <EmptyStateCard title={`Sei in ${seasonLabel} dabei`}>
          <p>
            Melde dich mit deinem Discord-Konto an, um dich für die nächste
            Saison zu registrieren. Die Anmeldung dauert keine zwei Minuten.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3.5">
            <SignInButton size="lg" className="h-11 px-6" />
            {closesAt ? (
              <span className="text-[13px] text-muted-foreground">
                Läuft bis {formatDeadline(closesAt)}
              </span>
            ) : null}
          </div>
        </EmptyStateCard>
        <p className="mt-4 flex items-start gap-2 text-[13px] text-muted-foreground">
          <Info className="mt-px size-[15px] shrink-0" aria-hidden />
          <span>
            Du brauchst ein Konto auf dem Discord-Server der VGC Gemeinde.
          </span>
        </p>
      </Shell>
    );
  }

  if (state === "not_started" || !window) {
    return (
      <Shell state={state} closesAt={closesAt} season={seasonLabel}>
        <EmptyStateCard title="Noch nicht geöffnet">
          Die Anmeldung für die nächste Saison startet in Kürze. Der Termin wird
          im Discord der VGC Gemeinde angekündigt. Schau dort vorbei, damit du
          nichts verpasst.
        </EmptyStateCard>
      </Shell>
    );
  }

  // Signed out while the window is closed: no action to offer, just the info.
  if (!current) {
    return (
      <Shell state={state} closesAt={closesAt} season={seasonLabel}>
        <EmptyStateCard title="Anmeldung geschlossen" informational>
          <p>
            Für {seasonLabel} sind keine Anmeldungen mehr möglich. Die nächste
            Chance kommt mit der neuen Saison. Angekündigt wird sie wie immer im
            Discord.
          </p>
          <p className="mt-2 text-[13px]">
            Geschlossen seit {formatLongTimestamp(window.closesAt)}
          </p>
        </EmptyStateCard>
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
        <EmptyStateCard title="Anmeldung geschlossen" informational>
          <p>
            Für {seasonLabel} sind keine Anmeldungen mehr möglich. Die nächste
            Chance kommt mit der neuen Saison. Angekündigt wird sie wie immer im
            Discord.
          </p>
          <p className="mt-2 text-[13px]">
            Geschlossen seit {formatLongTimestamp(window.closesAt)}
          </p>
        </EmptyStateCard>
      </Shell>
    );
  }

  // Confirmed non-members register on the server first. After the registration
  // branch on purpose: an already-registered player still sees their
  // confirmation and can withdraw; the season gate handles their membership.
  if (isConfirmedNonMember(current.guildMember)) {
    return (
      <Shell state={state} closesAt={closesAt} season={seasonLabel}>
        <MembershipBlockedCard />
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
          username={current.username}
          detectedReturning={detectedReturning}
        />
      </div>
    </Shell>
  );
}
