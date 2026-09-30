import { redirect } from "next/navigation";
import { bucketMembership } from "@/features/membership/membership";
import { sweepGuildMemberships } from "@/features/membership/sweep";
import { cancellationBlocked } from "@/features/registration/cancellation";
import {
  replacementCandidates,
  replacementsForWindow,
} from "@/features/replacements/queries";
import {
  entryRoundChoices,
  missedByEntryRound,
} from "@/features/replacements/replacement";
import { windowMatchOverview } from "@/features/reporting/queries";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { matchdaysForWindow } from "@/features/season/queries";
import {
  StaffParticipantList,
  type StaffParticipantRow,
} from "@/features/staff/components/participant-list";
import { StaffPage } from "@/features/staff/components/staff-page";
import { seasonParticipants } from "@/features/staff/participant-queries";
import type { ParticipantFilter } from "@/features/staff/participants";
import { latestWindow, windowSeasonPhase } from "@/features/staff/queries";
import { seasonName } from "@/features/staff/registration-window";
import { germanToday } from "@/lib/german-time";

const FILTERS: ParticipantFilter[] = [
  "all",
  "not_on_server",
  "unchecked",
  "dropped",
];

// The Teilnehmer page (docs/plans/staff-dashboard.md): registrations,
// Discord membership, drops and replacements as one list. Every load
// re-checks the membership of the whole roster (one Discord call, fail-open),
// exactly as the dashboard does.
export default async function StaffParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "staff")) {
    redirect("/");
  }
  const window = await latestWindow();
  if (!window) {
    redirect("/staff");
  }
  const { phase } = await windowSeasonPhase(window);
  await sweepGuildMemberships(window.id);

  const scheduled = phase === "schedule_hidden" || phase === "regular_season";
  const [participants, replacements, overview, matchdays, pool] =
    await Promise.all([
      seasonParticipants(window.id),
      replacementsForWindow(window.id),
      scheduled ? windowMatchOverview(window.id) : Promise.resolve([]),
      scheduled ? matchdaysForWindow(window.id) : Promise.resolve([]),
      // A replacement joins a running season; before that it is a
      // registration.
      phase === "regular_season"
        ? replacementCandidates(window.id)
        : Promise.resolve(null),
    ]);

  const rows: StaffParticipantRow[] = participants.map((row) => {
    const replaced = replacements.find(
      (r) => r.replaced.userId === row.identity.userId,
    );
    const replacing = replacements.find(
      (r) => r.replacement.userId === row.identity.userId && r.acceptedAt,
    );
    return {
      ...row,
      replacement: replaced ?? null,
      facts: {
        guildMember: row.guildMember,
        groupName: row.groupName,
        dropped: row.dropped,
        replacement: replaced
          ? {
              kind: replaced.acceptedAt ? "replaced" : "offered",
              otherName: replaced.replacement.name,
            }
          : replacing
            ? { kind: "replacing", otherName: replacing.replaced.name }
            : null,
      },
    };
  });

  const entryChoices = entryRoundChoices(matchdays, germanToday());
  const slotMatches = overview.map((match) => ({
    round: match.round,
    playerAId: match.playerA.userId,
    playerBId: match.playerB.userId,
  }));
  const missedByReplaced = Object.fromEntries(
    rows
      .filter((row) => row.dropped)
      .map((row) => [
        row.identity.userId,
        missedByEntryRound(
          slotMatches,
          row.identity.userId,
          entryChoices.map((choice) => choice.round),
        ),
      ]),
  );

  const requested = (await searchParams).filter as ParticipantFilter;
  const actions =
    cancellationBlocked(phase) === null
      ? "cancel"
      : phase === "seeded" || scheduled
        ? "drop"
        : "none";

  return (
    <StaffPage
      title="Teilnehmer"
      intro={
        actions === "cancel"
          ? `Alle Anmeldungen für ${seasonName(window.seasonNumber)} mit ihrem Stand auf dem Discord-Server. Bis zur fertigen Einteilung lässt sich eine Anmeldung stornieren.`
          : `Alle Spieler von ${seasonName(window.seasonNumber)} mit Gruppe, Discord-Mitgliedschaft, Drops und Ersatz. Wer nicht mehr mitspielen kann, wird gedroppt, ein gedroppter Platz lässt sich neu besetzen.`
      }
    >
      <StaffParticipantList
        rows={rows}
        actions={actions}
        seasonName={seasonName(window.seasonNumber)}
        offerOptions={pool ? { candidates: pool, entryChoices } : null}
        missedByReplaced={missedByReplaced}
        checkedAt={
          bucketMembership(
            participants.map((row) => ({
              userId: row.identity.userId,
              displayName: row.identity.name,
              username: row.username,
              avatarUrl: row.identity.avatarUrl,
              guildMember: row.guildMember,
              guildMemberCheckedAt: row.guildMemberCheckedAt,
            })),
          ).oldestCheckedAt
        }
        initialFilter={FILTERS.includes(requested) ? requested : "all"}
      />
    </StaffPage>
  );
}
