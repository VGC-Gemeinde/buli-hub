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
import { StaffPage } from "@/features/staff/components/staff-page";
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
      <StaffPage title="Divisionen">
        <EmptyStateCard title="Anmeldung läuft noch" informational>
          Die Einteilung ist erst möglich, sobald die Anmeldung geschlossen ist.
        </EmptyStateCard>
      </StaffPage>
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
    // The header (with the staff navigation) sits exactly as on every other
    // staff page; only
    // the workspace below is the wide one (a live meeting on one large
    // screen), and on a narrower window it scrolls sideways inside its own
    // frame instead of widening the whole document.
    <div className="flex h-screen flex-col overflow-hidden">
      <SiteHeader className="shrink-0" section="staff" />
      <MobileWarning />
      <div className="flex min-h-0 flex-1 overflow-x-auto">
        <div className="flex min-w-[1520px] flex-1 flex-col">
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
      </div>
    </div>
  );
}
