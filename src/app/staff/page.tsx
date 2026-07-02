import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { currentUserRole } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import {
  type RegisteredPlayer,
  RegistrationStatus,
} from "@/features/staff/components/registration-status";
import { latestWindow } from "@/features/staff/queries";
import { registrationState } from "@/features/staff/registration-window";

export default async function StaffPage() {
  const current = await currentUserRole();
  if (!current || !roleAtLeast(current.role, "staff")) {
    redirect("/");
  }

  const window = await latestWindow();
  const state = registrationState(window, new Date());
  // Browsers omit the Origin header on same-origin GET navigations, so
  // derive it from Host + forwarded protocol instead.
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const registrationUrl = `${protocol}://${host}/anmeldung`;

  // The registered-player list stays empty until the registration feature.
  const players: RegisteredPlayer[] = [];

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="mb-10 text-4xl text-brand-blue dark:text-white">
          Staff-Bereich
        </h1>
        <RegistrationStatus
          state={state}
          registrationUrl={registrationUrl}
          closesAt={window?.closesAt ?? null}
          players={players}
        />
      </main>
    </div>
  );
}
