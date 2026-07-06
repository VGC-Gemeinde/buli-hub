import { EmptyStateCard } from "@/components/empty-state-card";
import { Tick } from "@/components/tick";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatGermanDateTime } from "@/lib/german-time";
import { cn } from "@/lib/utils";
import type { RegistrationState } from "../registration-window";
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

function formatCloses(closesAt: Date): string {
  return formatGermanDateTime(closesAt, {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function SeasonCard({
  state,
  season,
  registrationUrl,
  closesAt,
  statusLabel,
  accent,
}: {
  state: RegistrationState;
  // The season name once a window exists; null before the first is opened (its
  // number is chosen in the open form below).
  season: string | null;
  registrationUrl: string;
  closesAt: Date | null;
  // Overrides for later phases the registration state alone cannot express
  // (e.g. the regular season running): a custom label and an active accent.
  statusLabel?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border px-6 py-5",
        state === "not_started" ? "gap-5" : "gap-2",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        <div className="font-heading font-bold text-2xl uppercase tracking-[0.02em] text-brand-blue dark:text-white">
          {season ?? "Nächste Saison"}
        </div>
        <div className="flex items-center gap-2">
          <Tick
            size="s"
            color={state === "open" || accent ? "orange" : "neutral"}
          />
          <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
            {statusLabel ?? STATUS_LABEL[state]}
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
      <EmptyStateCard title="Noch keine Anmeldungen" informational>
        Sobald sich die ersten Spieler über den Anmeldelink registrieren,
        erscheinen sie hier.
      </EmptyStateCard>
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
          className="flex h-9 min-w-0 items-center gap-2 rounded-lg border pr-2.5 pl-1"
        >
          <Avatar className="size-6">
            {player.avatarUrl ? (
              <AvatarImage src={player.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="font-semibold text-[10px] text-foreground">
              {player.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate font-medium text-sm">{player.name}</span>
        </div>
      ))}
    </div>
  );
}
