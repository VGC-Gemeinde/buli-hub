import { redirect } from "next/navigation";
import type { RegisteredPlayer } from "@/components/player-grid";
import { SiteHeader } from "@/components/site-header";
import { BannedCard } from "@/features/bans/components/banned-card";
import { isBanned } from "@/features/bans/queries";
import { markDropped } from "@/features/drops/drops";
import { droppedIdsForWindow } from "@/features/drops/queries";
import { MembershipBlockedCard } from "@/features/membership/components/blocked-card";
import { SeasonGates } from "@/features/membership/components/season-gates";
import { isConfirmedNonMember } from "@/features/membership/membership";
import { motwForWindow } from "@/features/motw/queries";
import { getProfile } from "@/features/profile/queries";
import { holdsForWindow } from "@/features/recordings/queries";
import { ProfileHint } from "@/features/registration/components/profile-hint";
import { RegistrationConfirmation } from "@/features/registration/components/registration-confirmation";
import { RegistrationForm } from "@/features/registration/components/registration-form";
import {
  getRegistration,
  listRegistrations,
  priorRegistrationCount,
} from "@/features/registration/queries";
import {
  isReturningPlayer,
  shouldShowProfileHint,
} from "@/features/registration/registration";
import { acceptReplacement } from "@/features/replacements/actions";
import { ReplacementOfferPanel } from "@/features/replacements/components/offer-panel";
import { ReplacementNote } from "@/features/replacements/components/replacement-note";
import {
  pendingOfferFor,
  replacementsForWindow,
} from "@/features/replacements/queries";
import {
  effectiveEntryRound,
  markReplacements,
  missedMatches,
  predecessorsOf,
  replacedByMap,
  replacementNotes,
} from "@/features/replacements/replacement";
import {
  divisionGroups,
  subDivisionResults,
} from "@/features/reporting/queries";
import {
  computeStandings,
  divisionStandings,
} from "@/features/reporting/standings";
import { currentUser } from "@/features/roles/guard";
import { hasSchedule } from "@/features/schedule/queries";
import { ParticipantList } from "@/features/season/components/participant-list";
import {
  ComingSoonPanel,
  RegisterCtaPanel,
  SeasonMessagePanel,
} from "@/features/season/components/pre-season";
import { InSeasonDashboard } from "@/features/season/components/season-dashboard";
import {
  buildPlayerMatches,
  currentMatchday,
  dashboardState,
  showsRoster,
  splitPlayerMatches,
} from "@/features/season/dashboard";
import {
  matchdaysForWindow,
  playerPlacement,
  subDivisionMatches,
} from "@/features/season/queries";
import { assignZones, type Zone } from "@/features/seeding/post-season";
import { divisionPostSeason, getSeeding } from "@/features/seeding/queries";
import {
  divisionName,
  subDivisionName,
  subDivisionShortName,
} from "@/features/seeding/seeding";
import {
  publicEmbargoedIds,
  withoutEmbargoed,
} from "@/features/spoilers/embargo";
import { latestWindow } from "@/features/staff/queries";
import {
  registrationState,
  seasonName,
} from "@/features/staff/registration-window";
import { seasonPhase } from "@/features/staff/season-phase";
import { germanToday } from "@/lib/german-time";
import { playerName } from "@/lib/player-name";

// Narrow shell with the plain title — used by every non-in-season state.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader section="spieler" />
      <main className="mx-auto w-full max-w-[640px] flex-1 px-6 py-12 sm:px-8">
        <h1 className="mb-9 text-[32px] text-brand-blue sm:text-[40px] dark:text-white">
          Spieler-Dashboard
        </h1>
        {children}
      </main>
    </div>
  );
}

export default async function SpielerPage() {
  const current = await currentUser();
  if (!current) {
    redirect("/");
  }

  const [window, profile] = await Promise.all([
    latestWindow(),
    getProfile(current.userId),
  ]);
  // Same nudge and the same gating as on the registration: shown until the
  // player edits their profile once or dismisses it (persisted server-side).
  const showProfileHint = shouldShowProfileHint(profile);
  const state = window ? registrationState(window, new Date()) : "not_started";
  const seeding =
    window && state === "closed" ? await getSeeding(window.id) : null;
  const seedingFinalized = Boolean(seeding?.finalizedAt);
  const scheduleExists =
    window && seedingFinalized ? await hasSchedule(window.id) : false;
  const phase = seasonPhase({
    registration: state,
    seedingFinalized,
    hasSchedule: scheduleExists,
    schedulePublished: Boolean(window?.schedulePublishedAt),
  });

  const [registration, banned] = await Promise.all([
    window ? getRegistration(window.id, current.userId) : null,
    // Only the registration paths ask; everything else stays open to a
    // banned player (docs/plans/banlist.md).
    isBanned(current.discordId),
  ]);
  const placement =
    window && phase === "regular_season"
      ? await playerPlacement(window.id, current.userId)
      : null;

  // Teilnehmerfeld: the same roster the staff dashboard lists, reduced to
  // identity and rendered alphabetically. Only fetched in the phases that show it.
  const roster: RegisteredPlayer[] =
    window && showsRoster(phase)
      ? (await listRegistrations(window.id)).map((row) => ({
          id: row.id,
          name: playerName(row.displayName, row.username),
          avatarUrl: row.avatarUrl ?? undefined,
        }))
      : [];

  const view = dashboardState({
    phase,
    registration: state,
    hasRegistration: registration !== null,
    isPlaced: placement !== null,
  });

  if (view === "in_season" && window && placement) {
    const today = germanToday();
    const [
      rawGroups,
      matchdays,
      rawMatches,
      resultByMatchId,
      droppedIds,
      motwSelections,
      holds,
      replacements,
    ] = await Promise.all([
      divisionGroups(placement.divisionId),
      matchdaysForWindow(window.id),
      subDivisionMatches(placement.subDivisionId),
      subDivisionResults(placement.subDivisionId),
      droppedIdsForWindow(window.id),
      motwForWindow(window.id),
      holdsForWindow(window.id),
      replacementsForWindow(window.id),
    ]);
    const accepted = replacements.filter((r) => r.acceptedAt !== null);
    const notes = replacementNotes(accepted);
    // Whose slot this player took over, and who took over theirs
    // (docs/plans/player-replacement.md).
    const replacing = accepted.find(
      (r) => r.replacement.userId === current.userId,
    );
    const replacedBy = accepted.find(
      (r) => r.replaced.userId === current.userId,
    );

    // The table counts public results only, for everyone alike: a withheld
    // result would give itself away through both players' wins and losses
    // (docs/plans/standings-embargo.md). Own results are no exception, they are
    // visible on the match page instead.
    const embargoed = publicEmbargoedIds({ motw: motwSelections, holds });
    const groups = rawGroups.map((group) => ({
      ...group,
      results: withoutEmbargoed(group.results, embargoed),
    }));
    const divisionWithheld = rawGroups.reduce(
      (total, group, index) =>
        total + (group.results.length - groups[index].results.length),
      0,
    );
    const ownIndex = rawGroups.findIndex(
      (group) => group.subDivisionId === placement.subDivisionId,
    );
    const groupWithheld =
      ownIndex >= 0
        ? rawGroups[ownIndex].results.length - groups[ownIndex].results.length
        : 0;

    // The player's own group is one of the division's groups — derive the group
    // roster + standings from it so the group is loaded only once.
    const ownGroup = groups.find(
      (group) => group.subDivisionId === placement.subDivisionId,
    );
    const members = ownGroup?.roster ?? [];
    // Names for the schedule come from everyone placed, so a match of the
    // rounds before a replacement still names the replaced player.
    const everyone = ownGroup?.members ?? [];

    const matchdaysByRound = new Map(
      matchdays.map((d) => [
        d.round,
        { startsOn: d.startsOn, endsOn: d.endsOn },
      ]),
    );
    const rosterById = new Map(everyone.map((m) => [m.userId, m]));
    const myMatches = buildPlayerMatches({
      matches: rawMatches,
      matchdaysByRound,
      rosterById,
      userId: current.userId,
      predecessorIds: predecessorsOf(
        current.userId,
        replacedByMap(
          accepted.map((r) => ({
            replacedUserId: r.replaced.userId,
            replacementUserId: r.replacement.userId,
            entryRound: r.entryRound,
          })),
        ),
      ),
    });
    const { next } = splitPlayerMatches(myMatches, today);
    const standings = markReplacements(
      markDropped(
        computeStandings({
          roster: members,
          results: ownGroup?.results ?? [],
        }),
        droppedIds,
      ),
      notes,
    );

    // Post-season zones are shown on the division's *relevant* table only. In
    // `division` mode the global table carries them and is the default view; in
    // `sub_division` mode the player's own group table carries them.
    const config = await divisionPostSeason(placement.divisionId);
    const divisionMode = config?.relevantTable === "division";
    const divisionRaw = divisionMode ? divisionStandings(groups) : null;
    const division = divisionRaw
      ? markReplacements(markDropped(divisionRaw, droppedIds), notes)
      : null;
    let groupZones: Map<string, Zone> | undefined;
    let divisionZones: Map<string, Zone> | undefined;
    if (division) {
      // Division mode: counts are the per-division totals.
      const zones = assignZones({
        rowCount: division.length,
        champion: config?.championshipPlayoffSlots ?? 0,
        promotions: config?.guaranteedPromotions ?? 0,
        promotionPlayoff: config?.promotionPlayoffSlots ?? 0,
        demotionPlayoff: config?.demotionPlayoffSlots ?? 0,
        demotions: config?.guaranteedDemotions ?? 0,
      });
      divisionZones = new Map(division.map((r, i) => [r.userId, zones[i]]));
    } else {
      // Sub-division mode: counts are per group, applied to the player's group.
      const zones = assignZones({
        rowCount: standings.length,
        champion: config?.championshipPlayoffSlots ?? 0,
        promotions: config?.guaranteedPromotions ?? 0,
        promotionPlayoff: config?.promotionPlayoffSlots ?? 0,
        demotionPlayoff: config?.demotionPlayoffSlots ?? 0,
        demotions: config?.guaranteedDemotions ?? 0,
      });
      groupZones = new Map(standings.map((r, i) => [r.userId, zones[i]]));
    }
    const defaultScope: "group" | "division" = division ? "division" : "group";
    // Sub-division chip labels for the merged division table (e.g. "2a").
    const divisionGroupLabels = division
      ? new Map(
          groups.flatMap((group) =>
            group.roster.map(
              (member) =>
                [
                  member.userId,
                  subDivisionShortName(placement.tier, group.position),
                ] as const,
            ),
          ),
        )
      : undefined;
    const totalRounds = matchdays.length;
    const currentRound =
      currentMatchday(matchdays, today)?.round ?? totalRounds;
    const groupName = subDivisionName(placement.tier, placement.position);

    return (
      <div className="flex flex-1 flex-col">
        <SeasonGates />
        <SiteHeader section="spieler" />
        <main className="mx-auto w-full max-w-[1040px] flex-1 px-6 pt-8 pb-18 sm:px-8">
          {showProfileHint ? (
            <div className="mb-6">
              <ProfileHint compact />
            </div>
          ) : null}
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h1 className="text-[28px] text-brand-blue leading-[1.1] sm:text-[34px] dark:text-white">
              Deine Saison
            </h1>
            <div className="flex items-center gap-2.5">
              <div className="h-[9px] w-[18px] -skew-x-[18deg] bg-brand-orange" />
              <span className="font-bold font-heading text-brand-blue text-xl uppercase tracking-[0.04em] dark:text-white">
                {groupName}
              </span>
              <span className="font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.12em]">
                · {seasonName(window.seasonNumber)}
              </span>
            </div>
          </div>
          {replacing ? (
            <ReplacementNote
              kind="replacing"
              other={replacing.replaced}
              entryRound={replacing.entryRound}
            />
          ) : replacedBy ? (
            <ReplacementNote
              kind="replaced"
              other={replacedBy.replacement}
              entryRound={replacedBy.entryRound}
            />
          ) : null}
          <InSeasonDashboard
            groupName={groupName}
            currentRound={currentRound}
            totalRounds={totalRounds}
            next={next}
            matches={myMatches}
            resultByMatchId={resultByMatchId}
            standings={standings}
            groupZones={groupZones}
            divisionName={divisionName(placement.tier)}
            divisionStandings={division}
            divisionZones={divisionZones}
            divisionGroupLabels={divisionGroupLabels}
            defaultScope={defaultScope}
            me={{
              userId: current.userId,
              name: playerName(current.displayName, current.username),
              avatarUrl: current.avatarUrl,
            }}
            groupWithheld={groupWithheld}
            divisionWithheld={divisionWithheld}
            today={today}
          />
        </main>
      </div>
    );
  }

  // Someone staff offered a dropped player's slot: the offer and its form
  // take the place of "not in this season" (docs/plans/player-replacement.md).
  const offer =
    view === "not_placed" && window
      ? await pendingOfferFor(window.id, current.userId)
      : null;
  if (offer && window) {
    const [slotMatches, matchdays, priorCount] = await Promise.all([
      subDivisionMatches(offer.subDivisionId),
      matchdaysForWindow(window.id),
      priorRegistrationCount(window.id, current.userId),
    ]);
    // The round the acceptance would fix today: staff's choice, or the
    // running matchday once that one is over.
    const entryRound =
      effectiveEntryRound(offer.entryRound, matchdays, germanToday()) ??
      offer.entryRound;
    const entryDay = matchdays.find((d) => d.round === entryRound);
    return (
      <Shell>
        <SeasonGates />
        {entryDay ? (
          <ReplacementOfferPanel
            replaced={offer.replaced}
            groupName={offer.groupName}
            seasonName={seasonName(window.seasonNumber)}
            entryRound={entryRound}
            entryStartsOn={entryDay.startsOn}
            entryEndsOn={entryDay.endsOn}
            missed={missedMatches(
              slotMatches,
              offer.replaced.userId,
              entryRound,
            )}
          >
            {banned ? (
              <BannedCard />
            ) : isConfirmedNonMember(current.guildMember) ? (
              <MembershipBlockedCard />
            ) : (
              <RegistrationForm
                displayName={current.displayName}
                username={current.username}
                detectedReturning={isReturningPlayer(priorCount)}
                submit={acceptReplacement}
                submitLabel="Platz übernehmen"
                footnote={`Mit dem Absenden übernimmst du den Platz verbindlich. Ab Spieltag ${entryRound} gilt dein Spielplan.`}
              />
            )}
          </ReplacementOfferPanel>
        ) : (
          <SeasonMessagePanel
            title="Kein Einstieg mehr möglich"
            body="Die Saison hat keinen Spieltag mehr, an dem du einsteigen kannst. Sprich mit dem Staff."
          />
        )}
      </Shell>
    );
  }

  const closesAt = window?.closesAt ?? null;
  const seasonLabel = window ? seasonName(window.seasonNumber) : "";
  const panel =
    view === "register_cta" ? (
      banned ? (
        <BannedCard />
      ) : (
        <RegisterCtaPanel seasonName={seasonLabel} />
      )
    ) : view === "registered_open" && registration ? (
      <RegistrationConfirmation
        data={registration}
        seasonName={seasonLabel}
        canWithdraw
        closesAt={closesAt}
      />
    ) : view === "registered_closed" && registration ? (
      <RegistrationConfirmation
        data={registration}
        seasonName={seasonLabel}
        canWithdraw={false}
        closesAt={closesAt}
        note="Die Anmeldung ist geschlossen. Du kannst deine Angaben nicht mehr ändern. Warte auf deine Paarungen."
      />
    ) : view === "not_registered_closed" ? (
      <SeasonMessagePanel
        title="Du bist in dieser Saison nicht dabei"
        body="Die Anmeldung ist bereits geschlossen. Die nächste Chance kommt. Schau im Discord vorbei."
      />
    ) : view === "not_placed" ? (
      <SeasonMessagePanel
        title="Du bist in der laufenden Saison nicht dabei"
        body="Für diese Saison liegt keine Einteilung für dich vor. Die nächste Anmeldung wird im Discord angekündigt."
      />
    ) : (
      <ComingSoonPanel />
    );

  return (
    <Shell>
      <SeasonGates />
      {showProfileHint ? (
        <div className="mb-8">
          <ProfileHint />
        </div>
      ) : null}
      {panel}
      {window && showsRoster(phase) ? (
        <ParticipantList players={roster} seasonName={seasonLabel} />
      ) : null}
    </Shell>
  );
}
