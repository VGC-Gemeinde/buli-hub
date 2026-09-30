import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Todo, TodoAction } from "../todos";

// "Zu erledigen" (docs/plans/staff-dashboard.md): one card, one row per
// problem, the tone as the 6px rail the tables use (red when something is
// overdue or held back, orange when it is due), the text left, the one action
// right. Links render here; controls (a dialog, the Discord sync) come from
// the page through `renderControl`, since they need the page's data.
export function TodoList({
  todos,
  renderControl,
}: {
  todos: Todo[];
  renderControl: (action: Exclude<TodoAction, { kind: "link" }>) => ReactNode;
}) {
  if (todos.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border px-5 py-4 text-muted-foreground text-sm">
        <CheckCircle2 aria-hidden className="size-4.5 shrink-0" />
        Nichts zu tun. Alles läuft.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      {todos.map((todo) => (
        <div
          key={todo.id}
          className={cn(
            "relative flex flex-col gap-3 border-b py-3.5 pr-4 pl-6 last:border-b-0 sm:flex-row sm:items-center sm:gap-6",
            todo.tone === "urgent"
              ? "bg-destructive/[0.04]"
              : "bg-brand-orange/[0.04]",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-0 left-0 w-1.5",
              todo.tone === "urgent" ? "bg-destructive" : "bg-brand-orange",
            )}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p
              className={cn(
                "font-semibold text-[14.5px]",
                todo.tone === "urgent" && "text-destructive",
              )}
            >
              {todo.title}
            </p>
            <p className="text-[13px] text-muted-foreground">{todo.detail}</p>
            {todo.lines && todo.lines.length > 0 ? (
              <ul className="mt-0.5 flex flex-col text-[12.5px] text-muted-foreground">
                {todo.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="shrink-0">
            {todo.action.kind === "link" ? (
              <Button
                asChild
                size="sm"
                variant={todo.tone === "urgent" ? "default" : "outline"}
              >
                <Link href={todo.action.href}>{todo.action.label}</Link>
              </Button>
            ) : (
              renderControl(todo.action)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
