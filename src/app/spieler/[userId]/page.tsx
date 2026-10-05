import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { EmptyStateCard } from "@/components/empty-state-card";
import { SiteHeader } from "@/components/site-header";
import { Tick } from "@/components/tick";
import { ProfileStaffPanel } from "@/features/drops/components/profile-staff-panel";
import {
  droppedIdsForWindow,
  placementDropState,
} from "@/features/drops/queries";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { favoriteIds } from "@/features/favorites/queries";
import { motwForWindow } from "@/features/motw/queries";
import { ProfileSpielplan } from "@/features/player-profile/components/profile-schedule";
import { profileScheduleRows } from "@/features/player-profile/profile";
import { profileIdentity } from "@/features/player-profile/queries";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { holdsForWindow } from "@/features/recordings/queries";
import { cancellationBlocked } from "@/features/registration/cancellation";
import { ProfileCancelPanel } from "@/features/registration/components/profile-cancel-panel";
import { getRegistration } from "@/features/registration/queries";
import {
  type ReplacementRow,
  replacementCandidates,
  replacementsForWindow,
} from "@/features/replacements/queries";
import {
  entryRoundChoices,
  missedByEntryRound,
  predecessorsOf,
  replacedByMap,
  replacedLine,
  replacementLine,
} from "@/features/replacements/replacement";
import {
  groupStandingsInput,
  subDivisionResults,
} from "@/features/reporting/queries";
import { computeStandings } from "@/features/reporting/standings";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast, roleLabel } from "@/features/roles/roles";
import { buildPlayerMatches } from "@/features/season/dashboard";
import {
  matchdaysForWindow,
  playerPlacement,
  subDivisionMatches,
} from "@/features/season/queries";
import { subDivisionName } from "@/features/seeding/seeding";
import {
  publicEmbargoedIds,
  withoutEmbargoed,
} from "@/features/spoilers/embargo";
import {
  parseSpoilersOff,
  SPOILERS_OFF_COOKIE,
} from "@/features/spoilers/spoilers";
import { latestWindow, windowSeasonPhase } from "@/features/staff/queries";
import { seasonName } from "@/features/staff/registration-window";
import { streamPhotoUrl } from "@/features/stream-photos/photo";
import { streamPhotoPathOf } from "@/features/stream-photos/queries";
import { germanToday } from "@/lib/german-time";

// The public player profile: the identity block known from the edit page,
// the current division + place, and the spoiler-protected Spielplan
// (docs/plans/player-profile.md). Public — no auth; unknown ids 404.
export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const identity = await profileIdentity(userId);
  if (!identity) {
    notFound();
  }

  const [current, cookieStore, window] = await Promise.all([
    currentUser(),
    cookies(),
    latestWindow(),
  ]);
  const spoilersOff = parseSpoilersOff(
    cookieStore.get(SPOILERS_OFF_COOKIE)?.value,
  );
  const placement = window ? await playerPlacement(window.id, userId) : null;

  // The season block (group, rank, Spielplan) is public only once the pairings
  // are published; staff see it earlier for internal review
  // (docs/plans/schedule-publish.md).
  const isStaff = current !== null && roleAtLeast(current.role, "staff");
  const scheduleVisible =
    window !== null && (window.schedulePublishedAt !== null || isStaff);

  // The season block: group + rank from the (drop-aware) standings, plus the
  // schedule rows. Placed without a schedule yet → empty rows, handled below.
  let season: {
    line: string;
    dropped: boolean;
    // Either side of a replacement (docs/plans/player-replacement.md).
    replacement: { kind: "replacing" | "replaced"; text: string } | null;
    rows: ReturnType<typeof profileScheduleRows>;
  } | null = null;
  const replacements: ReplacementRow[] =
    window && placement ? await replacementsForWindow(window.id) : [];
  const ownReplacement =
    replacements.find(
      (r) => r.replaced.userId === userId || r.replacement.userId === userId,
    ) ?? null;
  if (window && placement && scheduleVisible) {
    const [
      { roster, members, results },
      matches,
      resultByMatchId,
      matchdays,
      motwSelections,
      holds,
      droppedIds,
    ] = await Promise.all([
      groupStandingsInput(placement.subDivisionId),
      subDivisionMatches(placement.subDivisionId),
      subDivisionResults(placement.subDivisionId),
      matchdaysForWindow(window.id),
      motwForWindow(window.id),
      holdsForWindow(window.id),
      droppedIdsForWindow(window.id),
    ]);
    // The placement counts public results only, like every other table
    // (docs/plans/standings-embargo.md).
    const rank =
      computeStandings({
        roster,
        results: withoutEmbargoed(
          results,
          publicEmbargoedIds({ motw: motwSelections, holds }),
        ),
      }).find((row) => row.userId === userId)?.rank ?? null;
    const rows = profileScheduleRows({
      playerId: userId,
      viewerId: current?.userId ?? null,
      viewerIsStaff: isStaff,
      matches: buildPlayerMatches({
        matches,
        matchdaysByRound: new Map(matchdays.map((d) => [d.round, d])),
        rosterById: new Map(members.map((m) => [m.userId, m])),
        userId,
        predecessorIds: predecessorsOf(
          userId,
          replacedByMap(
            replacements
              .filter((r) => r.acceptedAt !== null)
              .map((r) => ({
                replacedUserId: r.replaced.userId,
                replacementUserId: r.replacement.userId,
                entryRound: r.entryRound,
              })),
          ),
        ),
      }),
      resultByMatchId,
      motwSelections,
      heldMatchIds: new Set(holds.map((h) => h.matchId)),
    });
    const groupName = subDivisionName(placement.tier, placement.position);
    season = {
      line: `${groupName}${rank !== null ? ` · Platz ${rank}` : ""} · ${seasonName(window.seasonNumber)}`,
      dropped: droppedIds.has(userId),
      replacement:
        ownReplacement?.acceptedAt == null
          ? null
          : ownReplacement.replacement.userId === userId
            ? {
                kind: "replacing",
                text: replacementLine({
                  replacedName: ownReplacement.replaced.name,
                  entryRound: ownReplacement.entryRound,
                }),
              }
            : {
                kind: "replaced",
                text: replacedLine({
                  replacementName: ownReplacement.replacement.name,
                  entryRound: ownReplacement.entryRound,
                }),
              },
      rows,
    };
  }

  // Staff panel, only for staff and only when there is something to act on:
  // from the open window until the finalized seeding a registration can be
  // cancelled; a placed player can be dropped / un-dropped.
  const phase =
    isStaff && window ? (await windowSeasonPhase(window)).phase : null;
  const canCancel =
    phase !== null &&
    cancellationBlocked(phase) === null &&
    window !== null &&
    (await getRegistration(window.id, userId)) !== null;
  const dropState =
    isStaff && window && placement && !canCancel
      ? await placementDropState(window.id, userId)
      : null;

  // A dropped player in the running season can be replaced from here too:
  // who could take over, from which matchday, and with how many losses.
  const offer =
    dropState?.droppedAt && window && placement && phase === "regular_season"
      ? await (async () => {
          const [candidates, matchdays, slotMatches] = await Promise.all([
            replacementCandidates(window.id),
            matchdaysForWindow(window.id),
            subDivisionMatches(placement.subDivisionId),
          ]);
          const entryChoices = entryRoundChoices(matchdays, germanToday());
          return {
            options: { candidates, entryChoices },
            missedByRound: missedByEntryRound(
              slotMatches,
              userId,
              entryChoices.map((choice) => choice.round),
            ),
          };
        })()
      : null;

  const favorited = current
    ? (await favoriteIds(current.userId)).has(userId)
    : false;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader section="liga" />
      <main className="mx-auto w-full max-w-[640px] flex-1 px-6 py-12 sm:px-8">
        {/* A profile is not a destination of the navigation; the way back
            is here (docs/plans/site-navigation.md). */}
        <BackLink fallbackHref="/" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <ProfileHeader
              displayName={identity.displayName}
              username={identity.username}
              avatarUrl={identity.avatarUrl}
              roleLabel={roleLabel(identity.role)}
            />
          </div>
          {/* Favourites are private and per viewer; nobody favourites
              themselves (docs/plans/favorites.md). */}
          {current && current.userId !== userId ? (
            <FavoriteButton playerId={userId} initialOn={favorited} />
          ) : null}
        </div>

        {season ? (
          <div className="mt-10 flex flex-col gap-8">
            <div className="flex flex-wrap items-center gap-2.5">
              <Tick size="s" />
              <span className="font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.12em]">
                {season.line}
              </span>
              {season.dropped ? (
                <span
                  title="Spieler wurde gedroppt, alle Matches zählen als Freewin für die Gegner"
                  className="rounded-full border border-destructive/40 bg-destructive/8 px-[7px] py-[2px] font-bold text-[10.5px] text-destructive uppercase tracking-[0.06em]"
                >
                  Drop
                </span>
              ) : null}
              {season.replacement?.kind === "replacing" ? (
                <span className="rounded-full border border-brand-blue/30 bg-brand-blue/6 px-[7px] py-[2px] font-bold text-[10.5px] text-brand-blue uppercase tracking-[0.06em] dark:border-white/30 dark:text-white">
                  Ersatz
                </span>
              ) : null}
              {season.replacement ? (
                <p className="basis-full text-[13.5px] text-muted-foreground">
                  {season.replacement.text}.
                  {season.replacement.kind === "replacing"
                    ? " Die Spieltage davor zählen für diesen Platz als Niederlage."
                    : " Nicht mehr in der Tabelle, steigt ab."}
                </p>
              ) : null}
            </div>
            <ProfileSpielplan
              rows={season.rows}
              initialSpoilersOff={spoilersOff}
            />
          </div>
        ) : (
          <div className="mt-10">
            <EmptyStateCard title="Nicht in der laufenden Saison" informational>
              Für diese Saison liegt keine Einteilung vor. Sobald{" "}
              {identity.name} in einer Division spielt, erscheinen hier Gruppe,
              Platzierung und Spielplan.
            </EmptyStateCard>
          </div>
        )}

        {canCancel && window ? (
          <ProfileCancelPanel
            player={{ userId, name: identity.name }}
            seasonName={seasonName(window.seasonNumber)}
          />
        ) : dropState && window && placement ? (
          <ProfileStaffPanel
            player={{
              userId,
              name: identity.name,
              groupName: subDivisionName(placement.tier, placement.position),
            }}
            avatarUrl={identity.avatarUrl}
            dropped={dropState.droppedAt !== null}
            dropReason={dropState.dropReason}
            replacement={
              ownReplacement?.replaced.userId === userId ? ownReplacement : null
            }
            offerOptions={offer?.options ?? null}
            missedByRound={offer?.missedByRound}
            streamPhotoUrl={streamPhotoUrl(await streamPhotoPathOf(userId))}
          />
        ) : null}
      </main>
    </div>
  );
}
