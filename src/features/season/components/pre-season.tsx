import Link from "next/link";
import { EmptyStateCard } from "@/components/empty-state-card";
import { Button } from "@/components/ui/button";

// No registration open / between seasons — a calm "nothing yet" state
// (§4.7 keine_saison). Informational: neutral tick.
export function ComingSoonPanel() {
  return (
    <EmptyStateCard title="Gerade läuft keine Saison" informational>
      Sobald die nächste Saison startet, findest du hier deinen Spielplan und
      deine nächste Paarung.
    </EmptyStateCard>
  );
}

// Registration is open and the player has not registered — the call to action
// (§4.7 anmeldung_offen). Orange-tinted CTA card with the primary action.
export function RegisterCtaPanel({ seasonName }: { seasonName: string }) {
  return (
    <EmptyStateCard
      title="Die Anmeldung läuft"
      className="border-brand-orange/40 bg-brand-orange/5"
      action={
        <Button asChild>
          <Link href="/anmeldung">Jetzt anmelden</Link>
        </Button>
      }
    >
      Melde dich für {seasonName} an, um in der nächsten Saison dabei zu sein.
    </EmptyStateCard>
  );
}

// Generic informational state (not placed in the running season; registration
// closed and never registered) — §4.7 nicht_platziert. Informational tick.
export function SeasonMessagePanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <EmptyStateCard title={title} informational>
      {body}
    </EmptyStateCard>
  );
}
