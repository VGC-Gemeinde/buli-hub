import { InlineLink } from "@/components/links";
import { Callout } from "@/features/regelwerk/components/callout";
import { PenaltyCard } from "@/features/regelwerk/components/penalty-card";
import {
  Aside,
  Bullet,
  Bullets,
  Key,
  Paragraph,
  SubBullets,
} from "@/features/regelwerk/components/prose";
import {
  NichtantretenPullOut,
  PunktePullOut,
  SpielwochePullOut,
  TiebreakerPullOut,
} from "@/features/regelwerk/components/pull-outs";
import type { RegelwerkDocument } from "@/features/regelwerk/content/types";

// The Saison-9 ruleset as supplied by the Orga, reproduced in full — no rule
// dropped or reworded beyond formatting. The four pull-outs and the callouts
// restate rules that also appear in the prose around them; that repetition is
// deliberate (design §2.7), because those are the rules players look up
// mid-match.

const DISCORD_INVITE = "https://discord.gg/YeVggq5bgK";

export const SAISON_9: RegelwerkDocument = {
  seasonNumber: 9,
  validFrom: "07.09.2026",
  emphasisIndex: 1,
  facts: [
    { label: "Anmeldeschluss", value: "30.08.2026", kind: "date" },
    { label: "Saisonstart", value: "07.09.2026", kind: "date" },
    { label: "Dauer", value: "10–12 Wochen", kind: "large" },
    { label: "Modus", value: "Best of 3 · Open Team Sheet", kind: "text" },
    { label: "Spielplan", value: "Single Round Robin", kind: "text" },
    { label: "Division", value: "max. 10 Spieler", kind: "text" },
  ],
  chapters: [
    {
      id: "anmeldung",
      number: 1,
      title: "Anmeldung",
      sections: [
        {
          title: "Wann und wo?",
          body: (
            <Bullets>
              <Bullet>
                Die 9. Saison der VGC Bundesliga startet am{" "}
                <Key>07.09.2026</Key> und dauert ca. <Key>10–12 Wochen</Key>.
              </Bullet>
              <Bullet>
                <Key>Online</Key>
                <SubBullets>
                  <Bullet>
                    <Key>Showdown</Key> und/oder <Key>Champions</Key>
                  </Bullet>
                </SubBullets>
              </Bullet>
            </Bullets>
          ),
        },
        {
          title: "Registrierung",
          body: (
            <Paragraph>
              Um an der Bundesliga teilzunehmen, müsst ihr euch bis zum{" "}
              <Key>30.08.2026</Key> auf{" "}
              <InlineLink href="/anmeldung">buli.vgcgemein.de</InlineLink>{" "}
              anmelden.
            </Paragraph>
          ),
        },
        {
          title: "Wer darf mitspielen?",
          body: (
            <Bullets>
              <Bullet>
                Jede Person, die dieses Regelwerk versteht und dessen Inhalt
                akzeptiert, darf mitspielen.
              </Bullet>
              <Bullet>
                Alle Spieler müssen <Key>Mitglied</Key> unseres{" "}
                <InlineLink href={DISCORD_INVITE} target="_blank">
                  Discord-Servers
                </InlineLink>{" "}
                sein.
                <SubBullets>
                  <Bullet>
                    Alle weiteren Infos zur Anmeldung findet ihr im Kanal{" "}
                    <Key>#liga-news</Key>.
                  </Bullet>
                  <Bullet>
                    Die <Key>Kommunikation</Key> sowohl zwischen Spielern als
                    auch mit der Orga findet auf dem <Key>Server</Key> statt.
                  </Bullet>
                </SubBullets>
              </Bullet>
              <Bullet>
                Es ist <Key>kein Startgeld</Key> nötig.
              </Bullet>
            </Bullets>
          ),
        },
      ],
    },
    {
      id: "struktur",
      number: 2,
      title: "Struktur der Liga",
      sections: [
        {
          title: "Format",
          body: (
            <Bullets>
              <Bullet>
                <Key>Best of 3, Open Team Sheet</Key>
              </Bullet>
              <Bullet>
                <Key>Single Round Robin</Key> (Jeder gegen jeden)
              </Bullet>
              <Bullet>
                Die Spieler werden in mehrere Divisionen mit maximal{" "}
                <Key>10 Teilnehmern</Key> aufgeteilt.
                <SubBullets>
                  <Bullet>
                    Die Spieler werden dabei{" "}
                    <Key>grob nach Skill-Niveau aufgeteilt</Key>. Wir bitten um
                    Nachsicht, falls ihr zu hoch oder niedrig eingestuft werdet.
                    Gerne könnt ihr uns spielerisch davon überzeugen, falsch
                    eingestuft worden zu sein.
                  </Bullet>
                  <Bullet>
                    Jede Division hat einen Discord-Channel, über den mit den
                    Gegnern kommuniziert wird.
                  </Bullet>
                </SubBullets>
              </Bullet>
              <Bullet>
                Wir halten uns stets an das Format des offiziellen Circuits.
                <SubBullets>
                  <Bullet>
                    Bei Wechsel des Formats während einer Saison wird es
                    entsprechende Informationen im Discord-Server geben.
                  </Bullet>
                </SubBullets>
              </Bullet>
            </Bullets>
          ),
        },
        {
          title: "Ligasystem",
          body: (
            <Bullets>
              <Bullet>
                Das Ligasystem wird abhängig von der Teilnehmerzahl beschlossen.
                Dies betrifft:
                <SubBullets>
                  <Bullet>Anzahl der Divisionen</Bullet>
                  <Bullet>Anzahl der Spieler je Division</Bullet>
                  <Bullet>
                    Anzahl der Gruppen (Subdivisionen) je Division
                  </Bullet>
                  <Bullet>Anzahl der Spieler je Gruppe</Bullet>
                </SubBullets>
              </Bullet>
              <Bullet>
                Am Ende einer Saison werden Spieler{" "}
                <Key>auf- und absteigen</Key> können.
                <SubBullets>
                  <Bullet>
                    Die genauen Inhalte des Auf- und Abstiegssystems sind
                    abhängig von der angemeldeten Spieleranzahl. Dabei gibt es
                    sowohl garantierte Auf- und Absteiger als auch eine
                    Relegation.
                  </Bullet>
                  <Bullet>
                    <Key>Relegations-Matches</Key> werden wie reguläre
                    Liga-Matches durchgeführt.
                  </Bullet>
                </SubBullets>
              </Bullet>
              <Bullet>
                Die besten Spieler aus Division 1 werden am Ende in den{" "}
                <Key>Meister-Play-Offs</Key> um den Titel spielen.
              </Bullet>
              <Bullet>
                Das genaue System wird kommuniziert, sobald die Einteilung der
                Spieler abgeschlossen ist. Je Division wird entweder die
                Gruppentabelle oder die Divisionstabelle wertungsrelevant sein.
              </Bullet>
            </Bullets>
          ),
        },
      ],
    },
    {
      id: "ablauf",
      number: 3,
      title: "Ablauf des Ligabetriebs",
      sections: [
        {
          title: "Scheduling",
          body: (
            <>
              <SpielwochePullOut />
              <Bullets>
                <Bullet>
                  Beide Spieler einigen sich jede Woche über Discord auf einen
                  Termin.
                  <SubBullets>
                    <Bullet>
                      Sämtliche Konversation muss über den{" "}
                      <Key>Division-Channel</Key> stattfinden, damit die Orga
                      bei möglichen Problemen alle Informationen hat.
                    </Bullet>
                    <Bullet>
                      Die vereinbarte Zeit für das Match muss im{" "}
                      <Key>Schedule-Channel</Key> festgehalten werden, wobei
                      beide Spieler in der Nachricht getaggt werden.
                    </Bullet>
                  </SubBullets>
                </Bullet>
                <Bullet>
                  Die Spiele dürfen in der jeweiligen Woche von{" "}
                  <Key>Montag 0:00 Uhr bis Sonntag 23:59 Uhr</Key> abgehalten
                  werden.
                </Bullet>
                <Bullet>
                  Bei Problemen muss das Orga-Team rechtzeitig informiert
                  werden.
                  <SubBullets>
                    <Bullet>
                      In Absprache mit dem Orga-Team kann ein Match in eine
                      folgende Woche verschoben werden. Bei versäumter
                      Match-Deadline behalten wir uns vor, Aktivitätsnachweise
                      einzufordern.
                    </Bullet>
                    <Bullet>
                      Ein bereits ausgemachtes Match kann bis{" "}
                      <Key>1 Stunde vor der vereinbarten Zeit</Key> rescheduled
                      werden. Häufige kurzfristige Absagen ohne schlüssige
                      Begründung können jedoch als unsportliches Verhalten
                      geahndet werden.
                    </Bullet>
                  </SubBullets>
                </Bullet>
              </Bullets>
            </>
          ),
        },
        {
          title: "Plattform",
          body: (
            <Bullets>
              <Bullet>
                Showdown oder Champions? Beides ist erlaubt.{" "}
                <Key>Ihr entscheidet.</Key>
                <SubBullets>
                  <Bullet>
                    Falls sich die Spieler nicht einigen können, auf welcher
                    Plattform gespielt werden soll, bekommt <Key>Showdown</Key>{" "}
                    den <Key>Vorrang</Key>.
                  </Bullet>
                </SubBullets>
              </Bullet>
              <Bullet>
                <Key>Showdown</Key>
                <SubBullets>
                  <Bullet>
                    Wir empfehlen, das <Key>Best-of-3-Format</Key> auszuwählen,
                    damit EVs nicht zwischen einzelnen Games angepasst werden
                    können.
                  </Bullet>
                  <Bullet>
                    <Key>Replays</Key> sollten <Key>gespeichert</Key> werden.
                  </Bullet>
                  <Bullet>
                    Falls beide Spieler einverstanden sind, darf das Match ohne
                    Timer gespielt werden.
                  </Bullet>
                </SubBullets>
              </Bullet>
              <Bullet>
                <Key>Champions</Key>
                <SubBullets>
                  <Bullet>
                    Wir empfehlen, <Key>Champions-Matches aufzunehmen</Key>. Das
                    hilft bei Streitigkeiten wie Verbindungsproblemen oder
                    Teamsheet-Fehlern. Im Zweifelsfall werden Spieler ohne
                    Aufnahme benachteiligt.
                  </Bullet>
                  <Bullet>
                    Die Nutzung des Spectator-Modes zur Aufnahme oder zum
                    Streamen ist erlaubt. Der Gegner muss im Vorhinein darüber
                    informiert werden.
                  </Bullet>
                </SubBullets>
              </Bullet>
            </Bullets>
          ),
        },
        {
          title: "Teams",
          body: (
            <>
              <Bullets>
                <Bullet>
                  Spieler haben jede Woche <Key>freie Teamwahl</Key>.
                </Bullet>
                <Bullet>
                  Bei Matches in Champions werden die <Key>Open Teamsheets</Key>{" "}
                  unmittelbar vor dem Match zwischen den Spielern im
                  Division-Channel ausgetauscht.
                  <SubBullets>
                    <Bullet>
                      Das Open Teamsheet muss nach den neuen offiziellen Regeln
                      auch das <Key>Wesen</Key> des Pokémon enthalten. Ein
                      fehlendes Wesen zählt als Teamsheet-Fehler.
                    </Bullet>
                    <Bullet>
                      <Key>Mega-Pokémon</Key> müssen in ihrer Basis-Form und mit
                      der Fähigkeit ihrer Basis-Form gelistet werden. Ein
                      Auflisten der Mega-Fähigkeit zählt als Teamsheet-Fehler.
                    </Bullet>
                  </SubBullets>
                </Bullet>
                <Bullet>
                  Bei Matches über Showdown wird die Open-Teamsheet-Funktion von
                  Showdown genutzt. Das Teamsheet ist trotzdem zur Einreichung
                  notwendig und sollte dem Gegner vor Beginn des Matches
                  zugesendet werden.
                </Bullet>
              </Bullets>
              <Callout title="Nachrichten sind unveränderlich">
                Die Nachrichten dürfen nicht bearbeitet oder gelöscht werden.{" "}
                <Aside>
                  Missachtung kann als Betrugsversuch interpretiert werden.
                </Aside>
              </Callout>
            </>
          ),
        },
        {
          title: "Reporten der Ergebnisse",
          body: (
            <>
              <Bullets>
                <Bullet>
                  Nach beendetem Match trägt einer der Spieler das Ergebnis
                  entsprechend im Buli Hub ein. Das Hochladen der Replays ist
                  dabei für alle Divisionen außer 1 &amp; 2 optional.
                </Bullet>
                <Bullet>
                  Das <Key>Open Teamsheet muss von allen Spielern</Key> per
                  Pokepaste-Link eingereicht werden (Beispiel:{" "}
                  <InlineLink
                    href="https://pokepast.es/03fb92411d6e2e20"
                    target="_blank"
                  >
                    pokepast.es
                  </InlineLink>
                  ). Aus technischen Gründen ist eine Nutzung von{" "}
                  <Key>VR Pastes hier nicht möglich</Key>.
                </Bullet>
                <Bullet>
                  Die Orga hat das Recht, Open Teamsheets zu veröffentlichen und
                  zur Datenanalyse zu nutzen.
                </Bullet>
              </Bullets>
              <Callout title="Replay-Pflicht" tickColor="orange">
                Von den Spielen in <Key>Division 1 &amp; 2</Key> müssen Replays
                hochgeladen werden.
              </Callout>
            </>
          ),
        },
      ],
    },
    {
      id: "bewertung",
      number: 4,
      title: "Bewertung",
      sections: [
        {
          title: "Bewertungssystem",
          body: (
            <>
              <PunktePullOut />
              <Paragraph>
                Bei gleicher Punktzahl entscheiden <Key>Tiebreaker</Key> — in
                dieser Reihenfolge:
              </Paragraph>
              <TiebreakerPullOut />
              <Callout title="Greift kein Tiebreaker">
                Dann teilen sich die Spieler den Platz, und der darauffolgende
                Platz entfällt (zwei dritte Plätze, weiter geht es mit Platz 5).
                Hängt an einem geteilten Platz ein Auf- oder Abstieg oder eine
                Play-Off-Qualifikation, müssen Tie-Breaker-Matches gespielt
                werden.
              </Callout>
            </>
          ),
        },
        {
          title: "Inaktivität / Nichtantreten",
          body: (
            <>
              <Bullets>
                <Bullet>
                  Es wird eine aktive Kommunikation mit dem Gegner
                  vorausgesetzt. Die erste Kontaktaufnahme sollte bis spätestens{" "}
                  <Key>Mittwochabend</Key> stattfinden und auf darauffolgende
                  Nachrichten angemessen zügig geantwortet werden.
                </Bullet>
                <Bullet>
                  Bei zu <Key>häufiger Inaktivität</Key> können Matches als{" "}
                  <Key>Niederlagen</Key> gewertet oder Spieler{" "}
                  <Key>gedroppt</Key> werden.
                  <SubBullets>
                    <Bullet>
                      <Aside>
                        Es ist okay, wenig Zeit für Pokémon zu haben, aber
                        kommuniziert das vernünftig mit euren Gegnern!
                      </Aside>
                    </Bullet>
                  </SubBullets>
                </Bullet>
                <Bullet>
                  <Key>Nichtantreten</Key> eines Spielers zählt als{" "}
                  <Key>Niederlage</Key>.
                </Bullet>
              </Bullets>
              <NichtantretenPullOut />
              <Bullets>
                <Bullet>
                  Meldet sich der Gegner rechtzeitig, kann das Match aber nicht
                  innerhalb der Frist antreten, hat der anwesende Spieler{" "}
                  <Key>trotzdem das Recht auf einen Freewin</Key>. Nur mit
                  beidseitigem Einverständnis kann ein neuer Termin ausgemacht
                  werden. Das Unter-Druck-Setzen des anwesenden Spielers wird
                  als unsportliches Verhalten geahndet.
                </Bullet>
                <Bullet>
                  Wenn keiner der beiden Spieler antritt, resultiert das Match
                  in einer <Key>Niederlage für beide Spieler</Key>, sofern sie
                  nicht zeitnah einen neuen Termin vereinbaren.
                </Bullet>
              </Bullets>
            </>
          ),
        },
        {
          title: "Drops",
          body: (
            <Bullets>
              <Bullet>
                Spieler können ihre Teilnahme an der Bundesliga jederzeit{" "}
                <Key>freiwillig beenden</Key>, was jedoch Konsequenzen haben
                kann.
              </Bullet>
              <Bullet>
                Weiterhin können Spieler <Key>gedroppt werden</Key>, wenn sie zu
                mindestens <Key>2 Matches nicht antreten</Key>. (Verschiebungen
                der Matches in andere Wochen sind nach Absprache mit der Orga
                möglich!)
              </Bullet>
              <Bullet>
                Gedroppte Spieler verlieren alle ihre Siege, werden an das Ende
                der Tabelle gesetzt und <Key>steigen garantiert ab</Key>.
                <SubBullets>
                  <Bullet>
                    Alle Matches eines gedroppten Spielers — auch bereits
                    gespielte — zählen als <Key>2–0 Freewin für den Gegner</Key>
                    ; sind beide Spieler eines Matches gedroppt, zählt es als{" "}
                    <Key>Doppelniederlage</Key>.
                  </Bullet>
                </SubBullets>
              </Bullet>
              <Bullet>
                Gedroppte Spieler, die weniger als die Hälfte der Matches
                gespielt haben, können für eine Saison{" "}
                <Key>von der VGC Bundesliga ausgeschlossen</Key> werden.
              </Bullet>
            </Bullets>
          ),
        },
        {
          title: "Deadlines",
          body: (
            <Bullets>
              <Bullet>
                Bis <Key>Mittwochabend</Key> muss sich für die Woche gemeldet
                werden, sonst kann der Gegner, der sich rechtzeitig gemeldet
                hat, Freewin beanspruchen.
                <SubBullets>
                  <Bullet>
                    Freewins können auch im Ermessen des Staff-Teams verteilt
                    werden.
                  </Bullet>
                  <Bullet>
                    Beidseitige Inaktivität kann zu einer{" "}
                    <Key>Doppelniederlage</Key> führen.
                  </Bullet>
                  <Bullet>
                    Falls ein Match nicht im Laufe der dafür vorgesehenen Woche
                    absolviert werden kann, sind <Key>Terminverschiebungen</Key>{" "}
                    in eine andere Woche möglich. Dazu muss der Orga{" "}
                    <Key>rechtzeitig vorher Bescheid</Key> gegeben werden.
                  </Bullet>
                  <Bullet>
                    Eine nicht eingehaltene Deadline ohne Absprache mit der Orga
                    kann je nach Aktivitätsnachweisen in einer{" "}
                    <Key>Niederlage</Key> für einen oder sogar beide Spieler
                    resultieren.
                  </Bullet>
                </SubBullets>
              </Bullet>
              <Bullet>
                Spieler müssen alle ihre <Key>Matches</Key> bis zum Ende des{" "}
                <Key>letzten Spieltages abgeschlossen</Key> haben. In der
                letzten Woche sind keine Terminverschiebungen möglich.
              </Bullet>
            </Bullets>
          ),
        },
        {
          title: "Strafen",
          body: (
            <>
              <Paragraph>
                Neben den bereits genannten Regeln zum Ablauf gibt es noch
                einige andere Situationen, in denen es zu Strafen für Spieler
                kommen kann.
              </Paragraph>
              <PenaltyCard title="Teamsheet-Fehler" qualifier="Champions">
                <Bullets className="text-[13px]">
                  <Bullet>
                    Bei Verdacht auf einen Teamsheet-Fehler sollte die Orga
                    hinzugezogen werden.
                  </Bullet>
                  <Bullet>
                    Das Aufzeichnen des Fehlers (durch Capture Card oder die
                    Switch Video-Funktion) wird empfohlen, um im Zweifelsfall
                    als Beweis dienen zu können.
                  </Bullet>
                  <Bullet>
                    Beendet ein Spieler das Match vorzeitig wegen eines
                    Teamsheet-Fehlers, welcher sich dann als Irrtum
                    herausstellt, gilt dieses Match als aufgegeben.
                  </Bullet>
                  <Bullet>
                    Ein Teamsheet-Fehler führt zu einem <Key>Gamewin</Key> für
                    den Gegner für das Game, in dem er entdeckt wurde. Wird er
                    zwischen Games entdeckt, gilt der Gamewin für das gerade
                    beendete Game.
                  </Bullet>
                  <Bullet>
                    Wenn möglich, muss das In-Game Team so angepasst werden,
                    dass es dem Teamsheet entspricht. Ist das nicht möglich,
                    entscheidet die Orga über das genaue weitere Vorgehen.
                  </Bullet>
                </Bullets>
              </PenaltyCard>
              <PenaltyCard title="Disconnects">
                <Bullets className="text-[13px]">
                  <Bullet>
                    Die Gewährleistung einer stabilen Internetverbindung liegt
                    in der Verantwortlichkeit der Spieler.
                  </Bullet>
                  <Bullet>
                    Sowohl Showdown als auch Champions haben eingebaute
                    Möglichkeiten, sich wieder zu verbinden, die genutzt werden
                    sollten.
                  </Bullet>
                  <Bullet>
                    Verliert ein Spieler ein Match aufgrund von
                    Internetproblemen,{" "}
                    <Key>gilt das Ergebnis dieses Matches trotzdem</Key>.
                  </Bullet>
                </Bullets>
              </PenaltyCard>
              <PenaltyCard title="Ghosting">
                <Bullets className="text-[13px]">
                  <Bullet>
                    Das Annehmen von Hinweisen oder Ratschlägen zu einem
                    laufenden Match ist <Key>strengstens verboten</Key>.
                  </Bullet>
                  <Bullet>
                    Sollte dieses Verhalten bekannt werden, wird es als höchst
                    unsportlich geahndet und kann zu einem{" "}
                    <Key>Ausschluss von der Bundesliga</Key> führen.
                  </Bullet>
                  <Bullet>
                    Das Teilen des eigenen Gameplays ist erlaubt, solange
                    keinerlei Kommunikation mit den Zuschauern stattfindet.
                  </Bullet>
                </Bullets>
              </PenaltyCard>
              <PenaltyCard title="Bugs" qualifier="Champions">
                <Bullets className="text-[13px]">
                  <Bullet>
                    Das Ausnutzen bekannter Bugs ist verboten und resultiert in
                    einem <Key>Gamewin für den Gegner</Key>. Das Vorgehen
                    entspricht dem bei einem Teamsheet-Fehler.
                  </Bullet>
                  <Bullet>
                    Sollte in einem Match ein unbekannter Bug auftreten, muss er
                    aufgezeichnet und der Kampf normal zu Ende geführt werden.
                    Nach Ende des Kampfes muss die Orga kontaktiert werden, die
                    die Aufzeichnung sichtet und über das weitere Vorgehen
                    entscheidet.
                  </Bullet>
                </Bullets>
              </PenaltyCard>
              <Paragraph>
                Neben den hier aufgeführten Situationen liegt es im Ermessen des
                Orga-Teams, weitere Strafen zu verteilen.
              </Paragraph>
            </>
          ),
        },
      ],
    },
  ],
};
