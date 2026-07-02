import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { ConfigForm } from "@/features/seeding/components/config-form";
import { PlacementList } from "@/features/seeding/components/placement-list";
import { orderForPlacement } from "@/features/seeding/placement";
import {
  getSeeding,
  listDivisions,
  listSeedingPlayers,
} from "@/features/seeding/queries";
import { divisionName } from "@/features/seeding/seeding";
import { StaffSectionHeader } from "@/features/staff/components/registration-status";
import { latestWindow } from "@/features/staff/queries";
import { registrationState } from "@/features/staff/registration-window";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[960px] flex-1 px-8 py-12">
        <h1 className="mb-9 text-4xl text-brand-blue dark:text-white">
          Divisionen einteilen
        </h1>
        {children}
      </main>
    </div>
  );
}

export default async function SeedingPage() {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    redirect("/");
  }

  const window = await latestWindow();
  const state = window ? registrationState(window, new Date()) : "not_started";

  if (!window || state !== "closed") {
    return (
      <Shell>
        <p className="text-muted-foreground">
          Die Einteilung ist erst möglich, sobald die Anmeldung geschlossen ist.
        </p>
      </Shell>
    );
  }

  const [seeding, divisions, players] = await Promise.all([
    getSeeding(window.id),
    listDivisions(window.id),
    listSeedingPlayers(window.id),
  ]);
  const orderedPlayers = orderForPlacement(players);

  return (
    <Shell>
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-5">
          <StaffSectionHeader title="Konfiguration" />
          <ConfigForm
            initialSize={seeding?.subDivisionSize ?? null}
            initialDivisionCount={divisions.length}
          />
        </section>

        {divisions.length > 0 ? (
          <section className="flex flex-col gap-5">
            <StaffSectionHeader
              title="Divisionen"
              meta={`${divisions.length} gesamt`}
            />
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
              {divisions.map((division) => (
                <li
                  key={division.id}
                  className="rounded-lg border px-4 py-3 font-medium text-sm"
                >
                  {divisionName(division.tier)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {divisions.length > 0 ? (
          <section className="flex flex-col gap-5">
            <StaffSectionHeader
              title="Spieler einteilen"
              meta={`${players.length} gesamt`}
            />
            {players.length > 0 ? (
              <PlacementList players={orderedPlayers} divisions={divisions} />
            ) : (
              <p className="text-muted-foreground text-sm">
                Keine Anmeldungen für diese Saison.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
