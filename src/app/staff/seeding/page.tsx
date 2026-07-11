import { redirect } from "next/navigation";
import { EmptyStateCard } from "@/components/empty-state-card";
import { SiteHeader } from "@/components/site-header";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { MobileWarning } from "@/features/seeding/components/mobile-warning";
import { SeedingWorkspace } from "@/features/seeding/components/seeding-workspace";
import { deriveControlState } from "@/features/seeding/control";
import {
  divisionsWithGroupSizes,
  getLockWithHolder,
  getSeeding,
  listDivisions,
  listSeedingPlayers,
  listSubDivisions,
} from "@/features/seeding/queries";
import { latestWindow } from "@/features/staff/queries";
import {
  registrationState,
  seasonName,
} from "@/features/staff/registration-window";

export default async function SeedingPage() {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    redirect("/");
  }

  const window = await latestWindow();
  const state = window ? registrationState(window, new Date()) : "not_started";

  if (!window || state !== "closed") {
    return (
      <div className="flex flex-1 flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
          <h1 className="mb-9 text-4xl text-brand-blue dark:text-white">
            Divisionen einteilen
          </h1>
          <EmptyStateCard title="Anmeldung läuft noch" informational>
            Die Einteilung ist erst möglich, sobald die Anmeldung geschlossen
            ist.
          </EmptyStateCard>
        </main>
      </div>
    );
  }

  const [seeding, divisions, players, subDivisions, postSeason, lock] =
    await Promise.all([
      getSeeding(window.id),
      listDivisions(window.id),
      listSeedingPlayers(window.id),
      listSubDivisions(window.id),
      divisionsWithGroupSizes(window.id),
      getLockWithHolder(window.id),
    ]);

  const controlState = deriveControlState({
    lock,
    currentUserId: current.userId,
    now: new Date(),
  });

  return (
    <div className="flex h-screen min-w-[1520px] flex-col overflow-hidden">
      <SiteHeader className="shrink-0" />
      <MobileWarning />
      <SeedingWorkspace
        players={players}
        divisions={divisions}
        subDivisions={subDivisions}
        initialSize={seeding?.subDivisionSize ?? null}
        initialDivisionCount={divisions.length}
        initialReplayTiers={seeding?.replayRequiredTiers ?? null}
        season={seasonName(window.seasonNumber)}
        postSeason={postSeason}
        postSeasonConfigured={Boolean(seeding?.postSeasonConfiguredAt)}
        finalized={Boolean(seeding?.finalizedAt)}
        finalizedAt={seeding?.finalizedAt ?? null}
        initialControlState={controlState}
        initialHolderName={lock?.holderName ?? null}
      />
    </div>
  );
}
