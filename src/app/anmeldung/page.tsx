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
import { registrationState } from "@/features/staff/registration-window";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="mb-9 text-4xl text-brand-blue dark:text-white">
          Anmeldung
        </h1>
        {children}
      </main>
    </div>
  );
}

function Message({ text }: { text: string }) {
  return <p className="text-muted-foreground">{text}</p>;
}

export default async function AnmeldungPage() {
  const current = await currentUser();
  if (!current) {
    return (
      <Shell>
        <div className="flex flex-col items-start gap-4">
          <Message text="Melde dich mit Discord an, um an der nächsten Saison teilzunehmen." />
          <SignInButton size="lg" />
        </div>
      </Shell>
    );
  }

  const window = await latestWindow();
  const state = window ? registrationState(window, new Date()) : "not_started";

  if (state === "not_started" || !window) {
    return (
      <Shell>
        <Message text="Die Anmeldung für die nächste Saison ist noch nicht geöffnet." />
      </Shell>
    );
  }

  const registration = await getRegistration(window.id, current.userId);
  if (registration) {
    return (
      <Shell>
        <RegistrationConfirmation
          data={registration}
          canWithdraw={state === "open"}
        />
      </Shell>
    );
  }

  if (state === "closed") {
    return (
      <Shell>
        <Message text="Die Anmeldung ist geschlossen." />
      </Shell>
    );
  }

  const [detectedReturning, profile] = await Promise.all([
    priorRegistrationCount(window.id, current.userId).then((n) => n > 0),
    getProfile(current.userId),
  ]);

  return (
    <Shell>
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
