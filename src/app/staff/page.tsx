import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { currentUserRole } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import {
  PlayerGrid,
  type RegisteredPlayer,
  SeasonCard,
  StaffSectionHeader,
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
      <main className="mx-auto w-full max-w-[960px] flex-1 px-8 py-12">
        <h1 className="mb-9 text-4xl text-brand-blue dark:text-white">
          Staff-Bereich
        </h1>
        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-5">
            <StaffSectionHeader title="Saison" />
            <SeasonCard
              state={state}
              registrationUrl={registrationUrl}
              closesAt={window?.closesAt ?? null}
            />
          </section>

          {state !== "not_started" ? (
            <section className="flex flex-col gap-5">
              <StaffSectionHeader
                title="Anmeldungen"
                meta={`${players.length} gesamt`}
              />
              <PlayerGrid players={players} />
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
