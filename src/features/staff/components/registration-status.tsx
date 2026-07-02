import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { RegistrationState } from "../registration-window";
import { SEASON_NAME } from "../registration-window";
import { CopyLinkButton } from "./copy-link-button";
import { OpenRegistrationForm } from "./open-registration-form";

// A registered player. The list is empty for now — the registration feature
// will populate it — so only the shape the view needs is defined here.
export type RegisteredPlayer = {
  id: string;
  name: string;
  avatarUrl?: string;
};

const STATUS_LABEL: Record<RegistrationState, string> = {
  not_started: "Anmeldung noch nicht geöffnet",
  open: "Anmeldung offen",
  closed: "Anmeldung geschlossen",
};

// Section header per DESIGN.md: skewed orange tick + condensed uppercase h2,
// with a bottom border and an optional right-aligned meta slot.
export function StaffSectionHeader({
  title,
  meta,
}: {
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex items-baseline justify-between border-b pb-3.5">
      <div className="flex items-center gap-2.5">
        <div className="h-[9px] w-[18px] -skew-x-[18deg] bg-brand-orange" />
        <h2 className="text-[26px] tracking-[0.03em]">{title}</h2>
      </div>
      {meta ? (
        <span className="text-muted-foreground text-sm">{meta}</span>
      ) : null}
    </div>
  );
}

function formatCloses(closesAt: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(closesAt);
}

export function SeasonCard({
  state,
  registrationUrl,
  closesAt,
}: {
  state: RegistrationState;
  registrationUrl: string;
  closesAt: Date | null;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border px-6 py-5",
        state === "not_started" ? "gap-5" : "gap-2",
      )}
    >
      <div className="flex items-center gap-3.5">
        <div className="font-heading font-bold text-2xl uppercase tracking-[0.02em] text-brand-blue dark:text-white">
          {SEASON_NAME}
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-4 -skew-x-[18deg]",
              state === "open" ? "bg-brand-orange" : "bg-border",
            )}
          />
          <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
            {STATUS_LABEL[state]}
          </span>
        </div>
      </div>

      {state === "not_started" ? (
        <>
          <OpenRegistrationForm />
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-muted-foreground">
              Anmeldelink (aktiv, sobald geöffnet):
            </p>
            <CopyLinkButton url={registrationUrl} />
          </div>
        </>
      ) : null}

      {state === "open" ? (
        <>
          {closesAt ? (
            <p className="text-muted-foreground text-sm">
              Schließt automatisch am {formatCloses(closesAt)}.
            </p>
          ) : null}
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-[13px] text-muted-foreground">Anmeldelink:</p>
            <CopyLinkButton url={registrationUrl} />
          </div>
        </>
      ) : null}

      {state === "closed" && closesAt ? (
        <p className="text-muted-foreground text-sm">
          Geschlossen seit {formatCloses(closesAt)}.
        </p>
      ) : null}
    </div>
  );
}

export function PlayerGrid({ players }: { players: RegisteredPlayer[] }) {
  if (players.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
        Noch keine Anmeldungen.
      </p>
    );
  }

  const sorted = players.toSorted((a, b) =>
    a.name.localeCompare(b.name, "de", { sensitivity: "base" }),
  );

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
      {sorted.map((player) => (
        <div
          key={player.id}
          className="flex min-w-0 items-center gap-2 rounded-lg border py-1 pr-2.5 pl-1"
        >
          <Avatar className="size-6">
            {player.avatarUrl ? (
              <AvatarImage src={player.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-[10px] font-semibold">
              {player.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium">{player.name}</span>
        </div>
      ))}
    </div>
  );
}
