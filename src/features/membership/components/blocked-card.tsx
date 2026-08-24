import { EmptyStateCard } from "@/components/empty-state-card";
import { Button } from "@/components/ui/button";
import { RecheckButton } from "@/features/membership/components/recheck-button";
import { DISCORD_INVITE_URL } from "@/lib/discord-invite";

// The registration block for a confirmed non-member: joining the server is the
// action, so the card leads with the invite and carries the recheck right next
// to it — after a successful recheck the refresh reveals the form in place.
export function MembershipBlockedCard() {
  return (
    <EmptyStateCard
      title="Erst dem Discord-Server beitreten"
      action={
        <div className="flex flex-wrap items-center gap-3.5">
          <Button asChild size="lg" className="h-11 px-6">
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noreferrer">
              Server beitreten
            </a>
          </Button>
          <RecheckButton label="Mitgliedschaft prüfen" variant="outline" />
        </div>
      }
    >
      <p>
        Für die Bundesliga musst du Mitglied auf dem Discord-Server der VGC
        Gemeinde sein. Dein Konto ist dort gerade nicht Mitglied. Tritt dem
        Server bei und prüfe deine Mitgliedschaft danach erneut.
      </p>
    </EmptyStateCard>
  );
}
