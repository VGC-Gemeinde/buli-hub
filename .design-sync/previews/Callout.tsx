import { Callout } from "buli-hub";
import { Aside, Key } from "@/features/regelwerk/components/prose";

/* Hard rules in the Regelwerk that must not be skimmed past. Orange and
 * emphasised for the one rule that costs a player something (Replay-Pflicht);
 * navy and muted for structural ones. Copy is the Saison-9 ruleset's own. */

export function ReplayPflicht() {
  return (
    <div className="max-w-2xl">
      <Callout title="Replay-Pflicht" tickColor="orange" emphasis>
        Von den Spielen in <Key>Division 1 &amp; 2</Key> müssen{" "}
        <Key>Replays hochgeladen</Key> werden!
      </Callout>
    </div>
  );
}

export function Strukturell() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Callout title="Nachrichten sind unveränderlich">
        Die Nachrichten dürfen nicht bearbeitet oder gelöscht werden.{" "}
        <Aside>Missachtung kann als Betrugsversuch interpretiert werden.</Aside>
      </Callout>
      <Callout title="Greift kein Tiebreaker">
        Dann teilen sich die Spieler den Platz, und der darauffolgende Platz
        entfällt (zwei dritte Plätze, weiter geht es mit Platz 5). Hängt an
        einem geteilten Platz ein Auf- oder Abstieg oder eine
        Playoff-Qualifikation, müssen Tie-Breaker-Matches gespielt werden.
      </Callout>
    </div>
  );
}

/* Outside the Regelwerk: the membership gate dialog's note. */
export function Sperrhinweis() {
  return (
    <div className="max-w-md">
      <Callout title="Bis dahin">
        Tabellen, Spielplan und Ergebnisse kannst du weiter ansehen. Nur
        Aktionen sind gesperrt.
      </Callout>
    </div>
  );
}
