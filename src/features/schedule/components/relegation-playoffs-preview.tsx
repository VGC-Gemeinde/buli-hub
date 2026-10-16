import { format, parseISO } from "date-fns";
import { SectionHeader } from "@/components/section-header";
import { Tick } from "@/components/tick";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import type { Identity } from "@/features/season/dashboard";
import { PLAYER_NAME_FALLBACK } from "@/lib/player-name";
import { cn } from "@/lib/utils";
import { relegationPlayoffsWeekName } from "../relegation-playoffs";
import type {
  PreviewMatch,
  PreviewSide,
  RelegationPlayoffsPreview,
} from "../relegation-playoffs-preview";

function ddMM(iso: string): string {
  return format(parseISO(iso), "dd.MM.");
}

// A side whose player is not known yet: the dashed circle instead of an
// avatar (design/PLAYOFFS.md §0.6).
function OpenCircle() {
  return (
    <span className="size-7 shrink-0 rounded-full border-[1.5px] border-border border-dashed" />
  );
}

function Side({
  side,
  identities,
  align,
}: {
  side: PreviewSide;
  identities: ReadonlyMap<string, Identity>;
  align: "start" | "end";
}) {
  const nameOf = (id: string) =>
    identities.get(id)?.name ?? PLAYER_NAME_FALLBACK;
  let main: React.ReactNode;
  let sub: string | null = null;
  let avatar: React.ReactNode = <OpenCircle />;
  if (side.kind === "winner") {
    main = <span className="text-muted-foreground">{side.label}</span>;
  } else {
    sub = side.seatLabel;
    if (side.holder.kind === "player") {
      const identity = identities.get(side.holder.userId) ?? {
        userId: side.holder.userId,
        name: PLAYER_NAME_FALLBACK,
        avatarUrl: null,
      };
      avatar = <PlayerAvatar identity={identity} />;
      main = <span className="font-semibold">{identity.name}</span>;
    } else if (side.holder.kind === "vacant") {
      main = <span className="text-muted-foreground">Bleibt leer</span>;
    } else {
      main = (
        <span className="text-muted-foreground">
          {side.holder.candidates.map(nameOf).join(" oder ")}
        </span>
      );
    }
  }
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        align === "end" && "sm:flex-row-reverse sm:text-right",
      )}
    >
      {avatar}
      <div className="min-w-0">
        <div className="truncate text-[14px]">{main}</div>
        {sub ? (
          <div className="truncate text-[12px] text-muted-foreground">
            {sub}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MatchList({
  matches,
  identities,
}: {
  matches: readonly PreviewMatch[];
  identities: ReadonlyMap<string, Identity>;
}) {
  return (
    <ul className="divide-y rounded-xl border">
      {matches.map((match) => (
        <li
          key={match.label}
          className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[56px_1fr_40px_1fr] sm:items-center sm:gap-3"
        >
          <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
            {match.label}
          </span>
          <Side side={match.a} identities={identities} align="start" />
          <span className="text-[12px] text-muted-foreground sm:text-center">
            gegen
          </span>
          <Side side={match.b} identities={identities} align="end" />
        </li>
      ))}
    </ul>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Tick size="s" color="navy" />
      <span className="font-semibold text-[12.5px] uppercase tracking-[0.12em]">
        {children}
      </span>
    </div>
  );
}

// Relegation und Playoffs as staff see them before publishing: the weeks,
// the shared places still to decide, every pairing with its seats and who
// holds them by the current table. Nothing here is public.
export function RelegationPlayoffsPreviewView({
  preview,
  identities,
}: {
  preview: RelegationPlayoffsPreview;
  identities: ReadonlyMap<string, Identity>;
}) {
  const nameOf = (id: string) =>
    identities.get(id)?.name ?? PLAYER_NAME_FALLBACK;
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {preview.weeks.map((week) => (
          <div key={week.week} className="rounded-xl border px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Tick size="s" color="neutral" />
              <span className="font-semibold text-[12px] uppercase tracking-[0.12em]">
                {relegationPlayoffsWeekName(week.week)}
              </span>
            </div>
            <div className="mt-1 text-[13px] text-muted-foreground tabular-nums">
              {ddMM(week.startsOn)} bis {ddMM(week.endsOn)}
            </div>
            <div className="mt-1 font-semibold text-[13.5px]">
              {week.content}
            </div>
          </div>
        ))}
      </div>

      {preview.ties.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeader tickColor="navy" count={preview.ties.length}>
            Gleichstände an Zonengrenzen
          </SectionHeader>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {preview.ties.map((tie) => (
              <li key={tie.key} className="rounded-xl border px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[14px] uppercase">
                    {tie.tableName}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 font-semibold text-[11px] uppercase tracking-[0.08em]">
                    {tie.decision === "tiebreaker"
                      ? "Tiebreaker"
                      : "Staff-Entscheidung nach Veröffentlichung"}
                  </span>
                </div>
                <div className="mt-1 text-[13px] text-muted-foreground">
                  {tie.placeLabel} geteilt · {tie.zones.join(" / ")}
                </div>
                <div className="mt-1.5 text-[14px]">
                  {tie.userIds.map(nameOf).join(", ")}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {preview.relegation.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeader tickColor="navy">Relegation</SectionHeader>
          {preview.relegation.map((boundary) => (
            <div key={boundary.name} className="flex flex-col gap-2">
              <SubHeading>{boundary.name}</SubHeading>
              <MatchList matches={boundary.matches} identities={identities} />
            </div>
          ))}
        </section>
      ) : null}

      {preview.playoffs === "unseparable" ? (
        <section className="flex flex-col gap-3">
          <SectionHeader tickColor="navy">Playoffs</SectionHeader>
          <p className="text-[14px] text-muted-foreground">
            Keine erste Runde hält die Gruppen auseinander. Prüfe die
            Playoff-Plätze der Einteilung.
          </p>
        </section>
      ) : preview.playoffs ? (
        <section className="flex flex-col gap-4">
          <SectionHeader tickColor="navy">Playoffs</SectionHeader>
          {preview.playoffs.map((round) => (
            <div key={round.name} className="flex flex-col gap-2">
              <SubHeading>
                {round.name} · {relegationPlayoffsWeekName(round.week)}
              </SubHeading>
              <MatchList matches={round.matches} identities={identities} />
              {round.byes.length > 0 ? (
                <div className="flex flex-col gap-2 rounded-xl border border-dashed px-4 py-3">
                  <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
                    Freilos
                  </span>
                  {round.byes.map((bye) => (
                    <Side
                      key={bye.kind === "seat" ? bye.seatLabel : bye.label}
                      side={bye}
                      identities={identities}
                      align="start"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
