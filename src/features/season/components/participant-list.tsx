import { EmptyStateCard } from "@/components/empty-state-card";
import { PlayerGrid, type RegisteredPlayer } from "@/components/player-grid";
import { SectionHeader } from "@/components/section-header";

// The Teilnehmerfeld on the Spieler-Dashboard: who is registered for the season,
// shown from the opening of the registration until the season starts. Identity
// only — the registration answers stay between the player and the staff, and the
// order is alphabetical so the list is not a sign-up ranking.
export function ParticipantList({
  players,
  seasonName,
}: {
  players: RegisteredPlayer[];
  seasonName: string;
}) {
  return (
    <section className="mt-12 flex flex-col gap-5">
      <SectionHeader count={players.length} meta={seasonName}>
        Teilnehmerfeld
      </SectionHeader>
      <PlayerGrid
        players={players}
        empty={
          <EmptyStateCard title="Noch niemand angemeldet" informational>
            Sobald sich die ersten Spieler anmelden, erscheinen sie hier.
          </EmptyStateCard>
        }
      />
    </section>
  );
}
