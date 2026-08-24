import { EmptyStateCard } from "@/components/empty-state-card";
import { SectionHeader } from "@/components/section-header";
import { RefreshListButton } from "@/features/membership/components/refresh-list-button";
import {
  bucketMembership,
  type RosterMembership,
} from "@/features/membership/membership";
import { PlayerLink } from "@/features/player-profile/components/player-link";
import { CancelRegistrationDialog } from "@/features/registration/components/cancel-registration-dialog";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import { formatGermanDateTime } from "@/lib/german-time";
import { playerName } from "@/lib/player-name";

// Presentational part of the staff membership section, in its own file (no
// database imports) so the /dev/ui gallery can render it from fixture rows.

function stampText(oldestCheckedAt: Date | null): string {
  if (oldestCheckedAt === null) {
    return "Noch nicht geprüft";
  }
  const formatted = formatGermanDateTime(oldestCheckedAt, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Zuletzt geprüft: ${formatted}`;
}

export function MembershipList({
  roster,
  seasonName,
  canCancel,
  id,
}: {
  roster: readonly RosterMembership[];
  seasonName: string;
  canCancel: boolean;
  // Anchor target for the dashboard's warning card ("Zur Liste").
  id?: string;
}) {
  const { nonMembers, unchecked, allConfirmed, oldestCheckedAt } =
    bucketMembership(roster);
  const open = [...nonMembers, ...unchecked];

  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-4">
      <SectionHeader
        tickColor="navy"
        count={open.length > 0 ? open.length : undefined}
        meta={
          <span className="flex items-center gap-1">
            {stampText(oldestCheckedAt)}
            <RefreshListButton />
          </span>
        }
      >
        Discord-Mitgliedschaft
      </SectionHeader>
      {allConfirmed ? (
        <EmptyStateCard title="Alle auf dem Server" informational>
          Alle angemeldeten Spieler sind Mitglied auf dem Discord-Server.
        </EmptyStateCard>
      ) : (
        <div className="flex flex-col gap-2">
          {open.map((row) => (
            <MembershipRow
              key={row.userId}
              row={row}
              seasonName={seasonName}
              canCancel={canCancel}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MembershipRow({
  row,
  seasonName,
  canCancel,
}: {
  row: RosterMembership;
  seasonName: string;
  canCancel: boolean;
}) {
  const name = playerName(row.displayName, row.username);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-4 py-2.5">
      <PlayerAvatar
        identity={{ userId: row.userId, name, avatarUrl: row.avatarUrl }}
        size="size-[26px]"
      />
      <span className="min-w-0 flex-1 truncate font-medium text-sm">
        <PlayerLink userId={row.userId} name={name} />
      </span>
      {row.guildMember === false ? (
        <span className="shrink-0 font-medium text-[13px] text-destructive">
          Nicht auf dem Server
        </span>
      ) : (
        <span className="shrink-0 text-[13px] text-muted-foreground">
          Noch nicht geprüft
        </span>
      )}
      {canCancel && row.guildMember === false ? (
        <CancelRegistrationDialog
          seasonName={seasonName}
          player={{ userId: row.userId, name }}
          triggerSize="sm"
        />
      ) : null}
    </div>
  );
}
