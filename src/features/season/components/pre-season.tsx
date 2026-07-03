import Link from "next/link";
import { Button } from "@/components/ui/button";

// No registration open / between seasons — a calm „nothing yet" state.
export function ComingSoonPanel() {
  return (
    <div className="rounded-lg border px-6 py-8 text-center">
      <p className="text-muted-foreground">
        Aktuell läuft keine Saison. Sobald die nächste Saison startet, findest
        du hier deinen Spielplan.
      </p>
    </div>
  );
}

// Registration is open and the player has not registered — the call to action.
export function RegisterCtaPanel({ seasonName }: { seasonName: string }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-6 py-6">
      <div>
        <p className="font-bold font-heading text-2xl text-brand-blue uppercase tracking-[0.02em] dark:text-white">
          Die Anmeldung läuft
        </p>
        <p className="mt-1 text-muted-foreground text-sm">
          Melde dich für {seasonName} an, um in der nächsten Saison dabei zu
          sein.
        </p>
      </div>
      <Button asChild>
        <Link href="/anmeldung">Jetzt anmelden</Link>
      </Button>
    </div>
  );
}

// Generic informational state (not placed in the running season; registration
// closed and never registered).
export function SeasonMessagePanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border px-6 py-6">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground text-sm">{body}</p>
    </div>
  );
}
