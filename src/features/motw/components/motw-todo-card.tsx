import Link from "next/link";
import { Button } from "@/components/ui/button";
import { emphasisSurface } from "@/lib/emphasis";
import { cn } from "@/lib/utils";
import type { MotwTodo } from "../motw";

// The staff dashboard's MotW todo: a warning while next week has no pick yet,
// escalating to the urgent variant when the running Spieltag has none. Purely
// informational — nothing (pairings included) is blocked by it.
export function MotwTodoCard({ todo }: { todo: NonNullable<MotwTodo> }) {
  const urgent = todo.urgency === "urgent";
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg px-5 py-4",
        emphasisSurface(urgent ? "destructive" : "orange"),
      )}
    >
      <div className="flex flex-col gap-0.5">
        <p
          className={cn(
            "font-semibold text-[14.5px]",
            urgent && "text-destructive",
          )}
        >
          Match of the Week für Spieltag {todo.round} wählen
        </p>
        <p className="text-[13px] text-muted-foreground">
          {urgent
            ? "Der aktuelle Spieltag läuft noch ohne Match of the Week."
            : "Der nächste Spieltag hat noch kein Match of the Week."}
        </p>
      </div>
      <Button
        asChild
        size="sm"
        variant={urgent ? "default" : "outline"}
        className={cn(!urgent && "border-brand-orange/50")}
      >
        <Link href="/staff/motw">Jetzt wählen</Link>
      </Button>
    </div>
  );
}
