import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { ConfigForm } from "@/features/seeding/components/config-form";
import { DivisionGroups } from "@/features/seeding/components/division-groups";
import { PlacementList } from "@/features/seeding/components/placement-list";
import { PublishPanel } from "@/features/seeding/components/publish-panel";
import {
  orderForPlacement,
  seedingReadiness,
} from "@/features/seeding/placement";
import {
  getSeeding,
  listDivisions,
  listSeedingPlayers,
  listSubDivisions,
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

  const [seeding, divisions, players, subDivisions] = await Promise.all([
    getSeeding(window.id),
    listDivisions(window.id),
    listSeedingPlayers(window.id),
    listSubDivisions(window.id),
  ]);
  const orderedPlayers = orderForPlacement(players);
  const anyAssigned = players.some((p) => p.divisionId !== null);
  const hasGroups = subDivisions.length > 0;
  const readiness = seedingReadiness(players);

  // Published: terminal, read-only view of the final groups.
  if (seeding?.publishedAt) {
    const publishedAt = new Intl.DateTimeFormat("de-DE", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(seeding.publishedAt);
    return (
      <Shell>
        <div className="flex flex-col gap-10">
          <div className="rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-4 py-3">
            <p className="text-sm">
              Die Einteilung wurde am {publishedAt} veröffentlicht und ist
              endgültig.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {divisions.map((division) => (
              <DivisionGroups
                key={division.id}
                division={division}
                players={players.filter((p) => p.divisionId === division.id)}
                subDivisions={subDivisions.filter(
                  (sd) => sd.divisionId === division.id,
                )}
                readOnly
              />
            ))}
          </div>
        </div>
      </Shell>
    );
  }

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

        {anyAssigned ? (
          <section className="flex flex-col gap-5">
            <StaffSectionHeader title="Gruppen" />
            <div className="flex flex-col gap-4">
              {divisions.map((division) => (
                <DivisionGroups
                  key={division.id}
                  division={division}
                  players={players.filter((p) => p.divisionId === division.id)}
                  subDivisions={subDivisions.filter(
                    (sd) => sd.divisionId === division.id,
                  )}
                />
              ))}
            </div>
          </section>
        ) : null}

        {hasGroups ? (
          <section className="flex flex-col gap-5">
            <StaffSectionHeader title="Veröffentlichen" />
            <PublishPanel
              total={readiness.total}
              grouped={readiness.grouped}
              ready={readiness.ready}
            />
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
