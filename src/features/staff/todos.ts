// The dashboard's "Zu erledigen" (docs/plans/staff-dashboard.md): every
// concrete problem of the league as one item with one anatomy. What is
// wrong, why it matters, the one action that solves it. Pure: the page reads
// the facts, this decides which items exist, in which tone and order, and
// what they say. Two tones: `urgent` (red) when something is overdue or held
// back, `due` (orange) when it simply wants doing. Urgent first, then in the
// order the list below adds them.

import type { MotwTodo } from "@/features/motw/motw";
import type { SeasonPhase } from "./season-phase";

export type TodoTone = "urgent" | "due";

// The action an item offers. Links are plain; the others are controls the
// page renders (a dialog or a server action).
export type TodoAction =
  | { kind: "link"; href: string; label: string }
  | { kind: "discord_sync" }
  | { kind: "publish_schedule" }
  | { kind: "create_schedule" };

export type Todo = {
  id: string;
  tone: TodoTone;
  title: string;
  detail: string;
  // Further short lines under the detail (the Discord skip list).
  lines?: string[];
  action: TodoAction;
};

export type TodoFacts = {
  phase: SeasonPhase;
  // Running season.
  overdue: number;
  // The open disputes; a single one links straight to its match.
  disputedMatchIds: string[];
  pendingFreeWins: number;
  staleRecordings: { count: number; allReported: boolean } | null;
  motw: MotwTodo;
  // schedule_hidden: what the publish would put live.
  publish: { rounds: number; matches: number } | null;
  // regular_season: the Discord sync, only when it needs attention.
  discord:
    | { kind: "never" }
    | { kind: "stale"; ranAtText: string }
    | {
        kind: "attention";
        summary: string;
        lines: string[];
      }
    | null;
  // Registered players Discord confirmed are not on the server (dropped
  // ones do not count).
  nonMembers: number;
  // seeded: the schedule that can be created, null when none computes.
  scheduleSetup: { groups: number; rounds: number; matches: number } | null;
};

export function staffTodos(facts: TodoFacts): Todo[] {
  const todos: Todo[] = [];

  if (facts.phase === "registration_closed") {
    todos.push({
      id: "seeding",
      tone: "due",
      title: "Divisionen einteilen",
      detail:
        "Die Anmeldung ist geschlossen, die Spieler warten auf ihre Einteilung.",
      action: {
        kind: "link",
        href: "/staff/seeding",
        label: "Jetzt einteilen",
      },
    });
  }
  if (facts.phase === "seeded") {
    todos.push(
      facts.scheduleSetup
        ? {
            id: "schedule",
            tone: "due",
            title: "Spielplan erstellen",
            detail: `${facts.scheduleSetup.groups} Gruppen · ${facts.scheduleSetup.rounds} Spieltage · ${facts.scheduleSetup.matches} Spiele. Die Saison startet mit der Erstellung des Spielplans.`,
            action: { kind: "create_schedule" },
          }
        : {
            id: "schedule",
            tone: "due",
            title: "Spielplan erstellen",
            detail:
              "Für die aktuelle Einteilung lässt sich kein Spielplan berechnen. Prüfe die Divisionen.",
            action: {
              kind: "link",
              href: "/staff/seeding",
              label: "Divisionen ansehen",
            },
          },
    );
  }
  if (facts.publish) {
    todos.push({
      id: "publish",
      tone: "due",
      title: "Spielplan veröffentlichen",
      detail: `${facts.publish.rounds} Spieltage · ${facts.publish.matches} Matches. Bis zur Veröffentlichung sehen nur Staff den Spielplan.`,
      action: { kind: "publish_schedule" },
    });
  }

  if (facts.overdue > 0) {
    todos.push({
      id: "overdue",
      tone: "urgent",
      title:
        facts.overdue === 1
          ? "1 Match ist überfällig"
          : `${facts.overdue} Matches sind überfällig`,
      detail:
        "Der Spieltag ist vorbei und es gibt kein Ergebnis. Nachhaken oder einen Freewin vergeben.",
      action: {
        kind: "link",
        href: "/staff/woche#ueberfaellig",
        label: "Ansehen",
      },
    });
  }
  const disputes = facts.disputedMatchIds.length;
  if (disputes > 0) {
    todos.push({
      id: "disputes",
      tone: "urgent",
      title:
        disputes === 1
          ? "1 Ergebnis ist angefochten"
          : `${disputes} Ergebnisse sind angefochten`,
      detail: "Ein Spieler hat widersprochen. Prüfen und entscheiden.",
      action:
        disputes === 1
          ? {
              kind: "link",
              href: `/match/${facts.disputedMatchIds[0]}`,
              label: "Prüfen",
            }
          : {
              kind: "link",
              href: "/staff/woche#angefochten",
              label: "Prüfen",
            },
    });
  }
  if (facts.staleRecordings) {
    const { count, allReported } = facts.staleRecordings;
    todos.push({
      id: "recordings",
      tone: "urgent",
      title:
        count === 1
          ? "1 Match aus einem vergangenen Spieltag wird noch zurückgehalten"
          : `${count} Matches aus vergangenen Spieltagen werden noch zurückgehalten`,
      detail: allReported
        ? "Die Ergebnisse sind gemeldet, aber noch nicht öffentlich. Nach dem Stream freigeben."
        : "Die Ergebnisse bleiben nach der Meldung zurückgehalten, bis sie freigegeben werden. Nach dem Stream freigeben.",
      action: {
        kind: "link",
        href: "/staff/aufnahmen",
        label: "Jetzt freigeben",
      },
    });
  }
  if (facts.motw) {
    const { round, kind, urgency } = facts.motw;
    todos.push({
      id: "motw",
      tone: urgency === "urgent" ? "urgent" : "due",
      title:
        kind === "confirm"
          ? `Match of the Week für Spieltag ${round} bestätigen`
          : `Kandidaten für Spieltag ${round} wählen`,
      detail:
        kind === "confirm"
          ? "Der Spieltag ist vorbei und die Kandidaten sind noch nicht entschieden. Solange wird weiter das Match der Vorwoche beworben."
          : urgency === "urgent"
            ? "Der aktuelle Spieltag läuft noch ohne Kandidaten für das Match of the Week."
            : "Der nächste Spieltag hat noch keine Kandidaten für das Match of the Week.",
      action: {
        kind: "link",
        href: `/staff/motw?spieltag=${round}`,
        label: kind === "confirm" ? "Jetzt bestätigen" : "Jetzt wählen",
      },
    });
  }
  if (facts.pendingFreeWins > 0) {
    todos.push({
      id: "freewins",
      tone: "due",
      title:
        facts.pendingFreeWins === 1
          ? "1 Freewin wartet auf Bestätigung"
          : `${facts.pendingFreeWins} Freewins warten auf Bestätigung`,
      detail:
        "Ein Spieler hat einen Freewin gemeldet. Er zählt erst nach der Bestätigung.",
      action: {
        kind: "link",
        href: "/staff/woche#freewins",
        label: "Ansehen",
      },
    });
  }
  if (facts.discord) {
    const discord = facts.discord;
    todos.push({
      id: "discord",
      tone: "due",
      title:
        discord.kind === "never"
          ? "Discord wurde noch nicht mit der Liga abgeglichen"
          : discord.kind === "stale"
            ? "Der Discord-Abgleich läuft nicht"
            : "Discord stimmt nicht mit der Liga überein",
      detail:
        discord.kind === "never"
          ? "Gruppenrollen, Gruppenkanäle und Spielerrollen werden beim Abgleich angelegt und zugeordnet."
          : discord.kind === "stale"
            ? `Letzter Abgleich: ${discord.ranAtText}. Der automatische Abgleich sollte alle 15 Minuten laufen.`
            : discord.summary,
      lines: discord.kind === "attention" ? discord.lines : undefined,
      action: { kind: "discord_sync" },
    });
  }
  if (facts.nonMembers > 0) {
    todos.push({
      id: "membership",
      tone: "due",
      title:
        facts.nonMembers === 1
          ? "Ein angemeldeter Spieler ist nicht auf dem Discord-Server"
          : `${facts.nonMembers} angemeldete Spieler sind nicht auf dem Discord-Server`,
      detail:
        "Für die Teilnahme ist die Mitgliedschaft Pflicht. Kläre mit den Spielern, ob sie noch dabei sind.",
      action: {
        kind: "link",
        href: "/staff/teilnehmer?filter=not_on_server",
        label: "Zur Liste",
      },
    });
  }

  // Stable: urgent first, each tone in the order above.
  return [
    ...todos.filter((todo) => todo.tone === "urgent"),
    ...todos.filter((todo) => todo.tone === "due"),
  ];
}
