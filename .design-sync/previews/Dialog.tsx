import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "buli-hub";

/* Radix renders the dialog in a portal, so the card only shows something if the
 * dialog is already open — `defaultOpen` is the static equivalent of the user
 * having clicked the trigger. Paired with cardMode:"single" in the config so
 * the open panel renders inside the card instead of escaping it. */

export function ResultMelden() {
  return (
    <Dialog defaultOpen>
      <DialogContent>
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
          <span className="text-muted-foreground text-sm">:</span>
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
