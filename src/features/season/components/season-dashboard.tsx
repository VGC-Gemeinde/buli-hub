import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { daysUntil, type Identity, type PlayerMatch } from "../dashboard";

function formatDeadline(dateStr: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
  }).format(new Date(`${dateStr}T00:00:00Z`));
}

function deadlineHint(endsOn: string, today: string): string {
  const days = daysUntil(endsOn, today);
  if (days < 0) return "überfällig";
  if (days === 0) return "heute fällig";
  if (days === 1) return "noch 1 Tag";
  return `noch ${days} Tage`;
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-[11px] w-[22px] -skew-x-[18deg] bg-brand-orange" />
      <h2 className="text-brand-blue text-xl dark:text-white">{title}</h2>
    </div>
  );
}

function PlayerIdentity({ identity }: { identity: Identity }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="size-7">
        {identity.avatarUrl ? (
          <AvatarImage src={identity.avatarUrl} alt="" />
        ) : null}
        <AvatarFallback className="font-semibold text-[10px]">
          {identity.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="truncate font-medium">{identity.name}</span>
    </div>
  );
}

// The prominent hero: the player's next match (or bye), its matchday and
// deadline. Null once the player's last matchday has passed.
export function NextPairing({
  match,
  today,
}: {
  match: PlayerMatch | null;
  today: string;
}) {
  return (
    <section className="rounded-xl border border-brand-orange/40 bg-brand-orange/5 px-6 py-5">
      <div className="flex items-center gap-2">
        <div className="h-2 w-4 -skew-x-[18deg] bg-brand-orange" />
        <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
          Nächste Paarung
        </span>
      </div>
      {match ? (
        <div className="mt-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] text-muted-foreground">
              Spieltag {match.round}
            </p>
            {match.opponent ? (
              <div className="mt-1.5 flex items-center gap-2 text-lg">
                <span className="text-muted-foreground">gegen</span>
                <PlayerIdentity identity={match.opponent} />
              </div>
            ) : (
              <p className="mt-1.5 text-lg">
                <span className="font-medium">Freilos</span> — diese Woche
                spielfrei.
              </p>
            )}
          </div>
          <div className="shrink-0 text-right text-sm">
            <p className="font-medium">bis {formatDeadline(match.endsOn)}</p>
            <p className="text-muted-foreground">
              {deadlineHint(match.endsOn, today)}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-muted-foreground text-sm">
          Keine weiteren Paarungen — die reguläre Saison ist für dich
          abgeschlossen.
        </p>
      )}
    </section>
  );
}

// The group's standings table. Until reporting lands, every row is 0:0 / 0 pts;
// rows are ordered by name (all tied) and the current player is highlighted.
export function GroupTable({
  groupName,
  members,
  meId,
}: {
  groupName: string;
  members: Identity[];
  meId: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading title={groupName} />
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.06em]">
              <th className="w-12 px-4 py-2">Platz</th>
              <th className="px-4 py-2">Spieler</th>
              <th className="w-20 px-4 py-2 text-right">Bilanz</th>
              <th className="w-20 px-4 py-2 text-right">Punkte</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, i) => (
              <tr
                key={member.userId}
                className={cn(
                  "border-b last:border-0",
                  member.userId === meId && "bg-brand-orange/5 font-medium",
                )}
              >
                <td className="px-4 py-2 text-muted-foreground tabular-nums">
                  {i + 1}
                </td>
                <td className="px-4 py-2">
                  <PlayerIdentity identity={member} />
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
                  0:0
                </td>
                <td className="px-4 py-2 text-right tabular-nums">0</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12.5px] text-muted-foreground">
        Die Tabelle füllt sich, sobald Ergebnisse gemeldet werden.
      </p>
    </section>
  );
}

// The player's remaining schedule after the next pairing.
export function UpcomingMatches({
  matches,
  today,
}: {
  matches: PlayerMatch[];
  today: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading title="Kommende Spiele" />
      {matches.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
          Keine weiteren Spiele geplant.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((match) => (
            <li
              key={match.round}
              className="flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-[74px] shrink-0 font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.06em]">
                  Spieltag {match.round}
                </span>
                {match.opponent ? (
                  <PlayerIdentity identity={match.opponent} />
                ) : (
                  <span className="font-medium">Freilos</span>
                )}
              </div>
              <span className="shrink-0 text-muted-foreground text-sm">
                bis {formatDeadline(match.endsOn)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// The full in-season dashboard: next pairing → group table → upcoming.
export function InSeasonDashboard({
  groupName,
  next,
  upcoming,
  members,
  meId,
  today,
}: {
  groupName: string;
  next: PlayerMatch | null;
  upcoming: PlayerMatch[];
  members: Identity[];
  meId: string;
  today: string;
}) {
  return (
    <div className="flex flex-col gap-8">
      <NextPairing match={next} today={today} />
      <GroupTable groupName={groupName} members={members} meId={meId} />
      <UpcomingMatches matches={upcoming} today={today} />
    </div>
  );
}
