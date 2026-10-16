import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EmptyStateCard } from "@/components/empty-state-card";
import { StaffRelegationPlayoffs } from "@/features/playoffs/components/relegation-playoffs-public";
import { publicRelegationPlayoffs } from "@/features/playoffs/queries";
import { boundaryName } from "@/features/relegation/pairings";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { CompleteSeasonPanel } from "@/features/schedule/components/complete-season-panel";
import { CreateRelegationPlayoffsDialog } from "@/features/schedule/components/create-relegation-playoffs-dialog";
import { RelegationPlayoffsPreviewView } from "@/features/schedule/components/relegation-playoffs-preview";
import {
  PublishPanel,
  StaffOrders,
} from "@/features/schedule/components/relegation-playoffs-staff";
import { StaffSteps } from "@/features/schedule/components/relegation-playoffs-steps";
import {
  relegationPlayoffsState,
  seasonCompletionState,
} from "@/features/schedule/relegation-playoffs-setup";
import { staffStep } from "@/features/schedule/relegation-playoffs-steps";
import { currentSeason } from "@/features/season/season-status";
import {
  parseSpoilersOff,
  SPOILERS_OFF_COOKIE,
} from "@/features/spoilers/spoilers";
import { StaffPage } from "@/features/staff/components/staff-page";

// Relegation und Playoffs in the Staff-Bereich
// (docs/plans/relegation-and-playoffs.md): creating their schedule, the
// preview of who would play whom while the regular season runs, publishing,
// the staff orders it leaves, the matches as they stand, and completing the
// season.
export default async function StaffRelegationPlayoffsPage() {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    redirect("/");
  }
  const { window, phase } = await currentSeason();
  if (!window || phase !== "regular_season") {
    redirect("/staff");
  }

  const [after, cookieStore] = await Promise.all([
    relegationPlayoffsState(window.id),
    cookies(),
  ]);
  const published = after.kind === "created" && after.blockers === null;
  const [completion, live] = published
    ? await Promise.all([
        seasonCompletionState(window.id),
        // Once published: the matches as they stand, with every result.
        publicRelegationPlayoffs(window.id, {
          userId: current.userId,
          isStaff: true,
        }),
      ])
    : [null, null];
  const spoilersOff = parseSpoilersOff(
    cookieStore.get(SPOILERS_OFF_COOKIE)?.value,
  );

  return (
    <StaffPage title="Relegation und Playoffs">
      <div className="flex flex-col gap-8">
        <StaffSteps
          current={staffStep({
            created: after.kind === "created",
            published,
            completed: completion?.completed ?? false,
          })}
        />
        {after.kind === "created" ? (
          <>
            {after.blockers !== null ? (
              <PublishPanel blockers={after.blockers} counts={after.counts} />
            ) : null}
            {completion ? (
              <CompleteSeasonPanel
                blockers={completion.blockers}
                completed={completion.completed}
              />
            ) : null}
            {published &&
            after.staffOrders.length > 0 &&
            !completion?.completed ? (
              <StaffOrders ties={after.staffOrders} />
            ) : null}
            {live ? (
              <StaffRelegationPlayoffs
                cards={live.cards}
                tiebreakers={live.tiebreakers}
                boundaries={[
                  ...new Set(
                    live.cards
                      .filter((card) => card.stage === "relegation")
                      .map((card) => card.tier),
                  ),
                ]
                  .sort((a, b) => a - b)
                  .map((tier) => ({
                    tier,
                    name: boundaryName(tier, tier + 1),
                  }))}
                spoilersOff={spoilersOff}
              />
            ) : (
              <RelegationPlayoffsPreviewView
                preview={after.preview}
                identities={after.identities}
              />
            )}
          </>
        ) : after.setup ? (
          <EmptyStateCard
            title="Spielplan noch nicht erstellt"
            action={<CreateRelegationPlayoffsDialog {...after.setup} />}
          >
            {`${after.setup.weekContents.length} ${after.setup.weekContents.length === 1 ? "Woche" : "Wochen"} nach dem letzten Spieltag mit ${after.setup.relegationMatches} Relegations- und ${after.setup.playoffMatches} Playoff-Matches. Ab dem Erstellen zeigt diese Seite, wer nach dem aktuellen Stand gegen wen spielt.`}
          </EmptyStateCard>
        ) : (
          <EmptyStateCard title="Noch nicht möglich" informational>
            Der Spielplan für Relegation und Playoffs schließt an den der Saison
            an und lässt sich erst danach erstellen.
          </EmptyStateCard>
        )}
      </div>
    </StaffPage>
  );
}
