import { EmptyStateCard } from "@/components/empty-state-card";

// What a banned player sees where the registration would be
// (docs/plans/banlist.md). Informational: there is nothing they can do here.
// The reason stays with staff, so the card only says that, and whom to ask.
export function BannedCard() {
  return (
    <EmptyStateCard title="Anmeldung gesperrt" informational>
      <p>
        Dein Konto ist für die Anmeldung zur VGC Bundesliga gesperrt. Alles
        andere im Buli-Hub steht dir weiter offen.
      </p>
      <p className="mt-2">
        Bei Fragen wende dich an den Staff im Discord der VGC Gemeinde.
      </p>
    </EmptyStateCard>
  );
}
