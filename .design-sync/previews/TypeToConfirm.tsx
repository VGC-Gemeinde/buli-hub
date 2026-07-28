import { Button, Input, Label, TypeToConfirm } from "buli-hub";

/* buli-hub's own destructive-confirmation field (`src/components/type-to-confirm.tsx`):
 * a Label that names the phrase in falinks-blue plus an Input placeholdered
 * with the same phrase. It is deliberately dumb — the caller owns `value`, the
 * `matchesConfirmationPhrase` check that gates the confirm button, and the
 * error. Its two homes are the drop dialog (phrase = the player's name) and
 * the seeding finalize dialog (phrase = the season). The cells reproduce the
 * dialog body around it, since the field alone does not explain itself.
 * `onChange` is a noop here — the cards are static. */

const noop = () => {};

export function SpielerDroppen() {
  return (
    <div className="grid w-full max-w-[440px] gap-4 rounded-lg border p-4">
      <div className="grid gap-2">
        <span className="text-[18px] text-brand-blue leading-none dark:text-white">
          Blaubeerkuchen droppen
        </span>
        <p className="text-[13px] text-muted-foreground leading-snug">
          Blaubeerkuchen (Division 1b): alle Matches des Spielers zählen ab
          sofort als Freewin (2:0) für die Gegner — auch bereits gespielte.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="drop-reason">
          Grund{" "}
          <span className="font-normal text-muted-foreground">
            (nur für den Staff sichtbar)
          </span>
        </Label>
        <Input id="drop-reason" defaultValue="Zeitmangel" autoComplete="off" />
      </div>
      <TypeToConfirm
        id="drop-confirm"
        phrase="Blaubeerkuchen"
        value=""
        onChange={noop}
      />
      <div>
        <Button variant="destructive" disabled>
          Spieler droppen
        </Button>
      </div>
    </div>
  );
}

export function Bestaetigt() {
  return (
    <div className="grid w-full max-w-[440px] gap-4 rounded-lg border p-4">
      <div className="grid gap-2">
        <span className="text-[18px] text-brand-blue leading-none dark:text-white">
          Seeding finalisieren
        </span>
        <p className="text-[13px] text-muted-foreground leading-snug">
          Danach werden die Divisionen veröffentlicht, der Spielplan wird
          finalisiert und kann danach nicht mehr geändert werden.
        </p>
      </div>
      <TypeToConfirm
        id="finalize-confirmation"
        phrase="Saison 5"
        value="Saison 5"
        onChange={noop}
      />
      <div className="flex items-center gap-3">
        <Button variant="outline">Abbrechen</Button>
        <Button>Seeding finalisieren</Button>
      </div>
    </div>
  );
}

export function MitFehler() {
  return (
    <div className="grid w-full max-w-[440px] gap-4 rounded-lg border p-4">
      <div className="grid gap-2">
        <span className="text-[18px] text-brand-blue leading-none dark:text-white">
          Anmeldung zurückziehen
        </span>
        <p className="text-[13px] text-muted-foreground leading-snug">
          Du wirst aus der laufenden Anmeldung entfernt. Eine erneute Anmeldung
          ist bis zum Anmeldeschluss möglich.
        </p>
      </div>
      <TypeToConfirm
        id="withdraw-confirmation"
        phrase="Testerino"
        value="testerin"
        onChange={noop}
        error="Der eingegebene Text stimmt nicht überein."
      />
      <div>
        <Button variant="destructive" disabled>
          Anmeldung zurückziehen
        </Button>
      </div>
    </div>
  );
}
