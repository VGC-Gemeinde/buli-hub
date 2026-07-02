import type { RegistrationState } from "../registration-window";
import { CopyLinkButton } from "./copy-link-button";
import { OpenRegistrationDialog } from "./open-registration-dialog";

// A registered player. The list is empty for now — the registration feature
// will populate it — so only the shape the view needs is defined here.
export type RegisteredPlayer = { id: string; name: string };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-[9px] w-[18px] -skew-x-[18deg] bg-brand-orange" />
      <h2 className="text-[26px] tracking-[0.03em]">{children}</h2>
    </div>
  );
}

function PlayerList({ players }: { players: RegisteredPlayer[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        {players.length} angemeldete Spieler
      </p>
      {players.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
          Noch keine Anmeldungen.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {players.map((player) => (
            <li key={player.id} className="rounded-md border px-3 py-2 text-sm">
              {player.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RegistrationStatus({
  state,
  registrationUrl,
  closesAt,
  players,
}: {
  state: RegistrationState;
  registrationUrl: string;
  closesAt: Date | null;
  players: RegisteredPlayer[];
}) {
  const closesAtLabel = closesAt
    ? new Intl.DateTimeFormat("de-DE", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(closesAt)
    : null;

  if (state === "not_started") {
    return (
      <div className="flex flex-col gap-6">
        <SectionLabel>Anmeldung</SectionLabel>
        <p className="text-muted-foreground text-sm">
          Die Anmeldung für die nächste Saison hat noch nicht begonnen.
        </p>
        <OpenRegistrationDialog />
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-muted-foreground">
            Anmeldelink (aktiv, sobald geöffnet):
          </p>
          <CopyLinkButton url={registrationUrl} />
        </div>
      </div>
    );
  }

  if (state === "open") {
    return (
      <div className="flex flex-col gap-6">
        <SectionLabel>Anmeldung läuft</SectionLabel>
        {closesAtLabel ? (
          <p className="text-muted-foreground text-sm">
            Schließt automatisch am {closesAtLabel}.
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-muted-foreground">Anmeldelink:</p>
          <CopyLinkButton url={registrationUrl} />
        </div>
        <PlayerList players={players} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionLabel>Anmeldung geschlossen</SectionLabel>
      {closesAtLabel ? (
        <p className="text-muted-foreground text-sm">
          Geschlossen seit {closesAtLabel}.
        </p>
      ) : null}
      <PlayerList players={players} />
    </div>
  );
}
