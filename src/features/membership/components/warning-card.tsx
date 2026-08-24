import { Button } from "@/components/ui/button";
import { emphasisSurface } from "@/lib/emphasis";
import { cn } from "@/lib/utils";

// The staff dashboard's membership warning, in the todo-card anatomy: as long
// as confirmed non-members are registered, the top of the page says so and
// points at the list (same-page anchor). Orange, not destructive — it asks
// staff to investigate, nothing is overdue.
export function MembershipWarningCard({
  count,
  listId,
}: {
  count: number;
  listId: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg px-5 py-4",
        emphasisSurface("orange"),
      )}
    >
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold text-[14.5px]">
          {count === 1
            ? "Ein angemeldeter Spieler ist nicht auf dem Discord-Server"
            : `${count} angemeldete Spieler sind nicht auf dem Discord-Server`}
        </p>
        <p className="text-[13px] text-muted-foreground">
          Für die Teilnahme ist die Mitgliedschaft Pflicht. Kläre mit den
          Spielern, ob sie noch dabei sind.
        </p>
      </div>
      <Button
        asChild
        size="sm"
        variant="outline"
        className="border-brand-orange/50"
      >
        <a href={`#${listId}`}>Zur Liste</a>
      </Button>
    </div>
  );
}
