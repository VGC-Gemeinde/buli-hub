import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  TypeToConfirm,
} from "buli-hub";

const noop = () => {};

/* Radix renders the dialog in a portal, so the card only shows something if the
 * dialog is already open — `defaultOpen` is the static equivalent of the user
 * having clicked the trigger. Paired with cardMode:"single" in the config so
 * the open panel renders inside the card instead of escaping it. */

export function ResultMelden() {
  return (
    <Dialog defaultOpen>
      {/* Radix focuses the first control on open; suppressed so the card
          shows the resting state instead of a focus ring on "Abbrechen". */}
      <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Ergebnis melden</DialogTitle>
          <DialogDescription>
            Trage das Ergebnis aus deiner Sicht ein. Dein Gegner bekommt es zur
            Bestätigung angezeigt.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 py-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium">Testerino</span>
            <span className="text-3xl font-semibold text-brand-blue dark:text-white">
              2
            </span>
          </div>
          <span className="self-end font-semibold text-3xl text-muted-foreground">
            :
          </span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium">Blaubeerkuchen</span>
            <span className="text-3xl font-semibold text-brand-blue dark:text-white">
              1
            </span>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button>Ergebnis melden</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The staff-side destructive dialog (cancel-registration-dialog.tsx): no
 *  footer, an irreversible action gated by TypeToConfirm, the destructive
 *  button disabled until the phrase matches. */
export function Stornieren() {
  return (
    <Dialog defaultOpen>
      <DialogContent
        className="sm:max-w-[480px]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Blaubeerkuchen: Anmeldung stornieren</DialogTitle>
          <DialogDescription>
            Die Anmeldung von Blaubeerkuchen für Saison 5 wird endgültig
            gelöscht, ebenso die Regelwerk-Bestätigung und eine eventuelle
            Platzierung in der Einteilung. Das lässt sich nicht rückgängig
            machen.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <TypeToConfirm
            id="cancel-registration-confirm"
            phrase="Blaubeerkuchen"
            value=""
            onChange={noop}
          />
          <div>
            <Button type="button" variant="destructive" disabled>
              Endgültig stornieren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
