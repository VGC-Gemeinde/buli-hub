import { PenaltyCard } from "buli-hub";
import { Bullet, Bullets, Key } from "@/features/regelwerk/components/prose";

/* The Strafen chapter's four parallel cases. "Champions" marks the two that
 * only apply on cartridge. Copy is the Saison-9 ruleset's own. */

export function MitQualifier() {
  return (
    <div className="max-w-2xl">
      <PenaltyCard title="Teamsheet-Fehler" qualifier="Champions">
        <Bullets className="text-[13px]">
          <Bullet>
            Bei Verdacht auf einen Teamsheet-Fehler sollte die Orga hinzugezogen
            werden.
          </Bullet>
          <Bullet>
            Das Aufzeichnen des Fehlers (durch Capture Card oder die Switch
            Video-Funktion) wird empfohlen, um im Zweifelsfall als Beweis dienen
            zu können.
          </Bullet>
          <Bullet>
            Ein Teamsheet-Fehler führt zu einem <Key>Gamewin</Key> für den
            Gegner für das Game, in dem er entdeckt wurde.
          </Bullet>
        </Bullets>
      </PenaltyCard>
    </div>
  );
}

export function OhneQualifier() {
  return (
    <div className="max-w-2xl">
      <PenaltyCard title="Ghosting">
        <Bullets className="text-[13px]">
          <Bullet>
            Das Annehmen von Hinweisen oder Ratschlägen zu einem laufenden Match
            ist <Key>strengstens verboten</Key>.
          </Bullet>
          <Bullet>
            Sollte dieses Verhalten bekannt werden, wird es als höchst
            unsportlich geahndet und kann zu einem{" "}
            <Key>Ausschluss von der Bundesliga</Key> führen.
          </Bullet>
          <Bullet>
            Das Teilen des eigenen Gameplays ist erlaubt, solange keinerlei
            Kommunikation mit den Zuschauern stattfindet.
          </Bullet>
        </Bullets>
      </PenaltyCard>
    </div>
  );
}

/* As the chapter stacks them. */
export function Strafenkapitel() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <PenaltyCard title="Disconnects">
        <Bullets className="text-[13px]">
          <Bullet>
            Die Gewährleistung einer stabilen Internetverbindung liegt in der
            Verantwortlichkeit der Spieler.
          </Bullet>
          <Bullet>
            Verliert ein Spieler ein Match aufgrund von Internetproblemen,{" "}
            <Key>gilt das Ergebnis dieses Matches trotzdem</Key>.
          </Bullet>
        </Bullets>
      </PenaltyCard>
      <PenaltyCard title="Bugs" qualifier="Champions">
        <Bullets className="text-[13px]">
          <Bullet>
            Das Ausnutzen bekannter Bugs ist verboten und resultiert in einem{" "}
            <Key>Gamewin für den Gegner</Key>.
          </Bullet>
        </Bullets>
      </PenaltyCard>
    </div>
  );
}
