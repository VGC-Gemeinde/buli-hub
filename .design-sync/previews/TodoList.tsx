import { Button, TodoList } from "buli-hub";
import type { Todo } from "@/features/staff/todos";

/* "Zu erledigen" on the staff overview: one card, one row per problem, the
 * tone as the 6px rail (red when overdue or held back, orange when due), the
 * one action on the right. Links render inside; controls (a dialog, the
 * Discord sync) come from the page through `renderControl`. Ported from the
 * dev/ui gallery's GALLERY_TODOS. */

const TODOS: Todo[] = [
  {
    id: "overdue",
    tone: "urgent",
    title: "2 Matches sind überfällig",
    detail:
      "Der Spieltag ist vorbei und es gibt kein Ergebnis. Nachhaken oder einen Freewin vergeben.",
    action: { kind: "link", href: "/staff/woche", label: "Ansehen" },
  },
  {
    id: "motw",
    tone: "due",
    title: "Kandidaten für Spieltag 3 wählen",
    detail:
      "Der nächste Spieltag hat noch keine Kandidaten für das Match of the Week.",
    action: { kind: "link", href: "/staff/motw", label: "Jetzt wählen" },
  },
  {
    id: "discord",
    tone: "due",
    title: "Discord stimmt nicht mit der Liga überein",
    detail:
      "17 von 18 Gruppen mit Rolle und Kanal · 130 von 133 Spielern mit beiden Rollen · Letzter Abgleich: 30.09.26, 12:00",
    lines: ["Gruppe 4e: Kanal fehlt"],
    action: { kind: "discord_sync" },
  },
];

const ONLY_DUE: Todo[] = [
  {
    id: "schedule",
    tone: "due",
    title: "Spielplan veröffentlichen",
    detail:
      "9 Spieltage mit 612 Matches sind erstellt und noch nicht sichtbar.",
    action: { kind: "publish_schedule" },
  },
];

export function Gemischt() {
  return (
    <div className="max-w-3xl">
      <TodoList
        todos={TODOS}
        renderControl={() => (
          <Button type="button" size="sm" variant="outline">
            Jetzt abgleichen
          </Button>
        )}
      />
    </div>
  );
}

export function NichtsOffen() {
  return (
    <div className="max-w-3xl">
      <TodoList todos={[]} renderControl={() => null} />
    </div>
  );
}

export function NurSteuerelement() {
  return (
    <div className="max-w-3xl">
      <TodoList
        todos={ONLY_DUE}
        renderControl={() => (
          <Button type="button" size="sm">
            Veröffentlichen
          </Button>
        )}
      />
    </div>
  );
}
