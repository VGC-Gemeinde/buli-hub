import {
  Button,
  Checkbox,
  EmptyStateCard,
  InlineLink,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  ReplacementOfferPanel,
} from "buli-hub";
import type { Identity } from "@/features/season/dashboard";

/* What the Spieler-Dashboard shows someone staff offered a dropped player's
 * slot (docs/plans/player-replacement.md): the "Ein Platz für dich" card
 * with whose place it is, the group and the entry Spieltag as a three-fact
 * strip, and how many losses the record starts with. Below it "Deine
 * Angaben", which is `children`: the registration questions, or the
 * membership block in their place.
 *
 * The real children (RegistrationForm, MembershipBlockedCard) are not in the
 * bundle (they reach server actions), so the cells compose the same anatomy
 * from the primitives: Label + Input, the orange-checked radio cards, the
 * Regelwerk checkbox, the submit button with its footnote.
 */

const NACLI: Identity = { userId: "nacli", name: "Nacli", avatarUrl: null };

const OPTION =
  "flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 px-3.5 has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/5";

function Choice({
  values,
  value,
}: {
  values: { value: string; label: string }[];
  value: string;
}) {
  return (
    <RadioGroup className="grid grid-cols-2 gap-2" defaultValue={value}>
      {values.map((option) => (
        // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
        <label key={option.value} className={OPTION}>
          <RadioGroupItem value={option.value} />
          <span className="font-medium text-sm">{option.label}</span>
        </label>
      ))}
    </RadioGroup>
  );
}

function Form({ entryRound }: { entryRound: number }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-2">
        <Label htmlFor="display-name">Anzeigename</Label>
        <Input id="display-name" value="Wiglett" disabled readOnly />
        <p className="text-[13px] text-muted-foreground leading-snug">
          Dein Name auf unserem Discord-Server. Ändere ihn dort, falls nötig.
        </p>
      </div>
      <div className="grid gap-2">
        <Label>Präferierte Plattform</Label>
        <Choice
          value="showdown"
          values={[
            { value: "showdown", label: "Pokémon Showdown" },
            { value: "cartridge", label: "Cartridge (Pokémon Champions)" },
          ]}
        />
      </div>
      <div className="grid gap-2">
        <Label>Hast du schon einmal teilgenommen?</Label>
        <Choice
          value="nein"
          values={[
            { value: "ja", label: "Ja" },
            { value: "nein", label: "Nein" },
          ]}
        />
      </div>
      <label
        htmlFor="regelwerk-akzeptiert"
        className="flex min-h-11 cursor-pointer items-start gap-3 text-[13px] leading-[1.55]"
      >
        <Checkbox id="regelwerk-akzeptiert" defaultChecked className="mt-0.5" />
        <span>
          Ich habe das{" "}
          <InlineLink href="/regelwerk">
            Regelwerk der VGC Bundesliga
          </InlineLink>{" "}
          gelesen und akzeptiere es.
        </span>
      </label>
      <div className="flex flex-col gap-2">
        <div>
          <Button type="button" size="lg" className="h-11 px-6">
            Platz übernehmen
          </Button>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Mit dem Absenden übernimmst du den Platz verbindlich. Ab Spieltag{" "}
          {entryRound} gilt dein Spielplan.
        </p>
      </div>
    </div>
  );
}

/** Entry at Spieltag 3: two missed Spieltage count as losses, the form
 *  below. */
export const MitFormularZweiNiederlagen = () => (
  <ReplacementOfferPanel
    replaced={NACLI}
    groupName="Division 1a"
    seasonName="Saison 9"
    entryRound={3}
    entryStartsOn="2026-09-21"
    entryEndsOn="2026-10-04"
    missed={2}
  >
    <Form entryRound={3} />
  </ReplacementOfferPanel>
);

/** Entry at Spieltag 1, nothing missed; the player is not on the Discord
 *  server, so the membership block takes the form's place. */
export const OhneVerpassteSpieltageMitgliedschaftFehlt = () => (
  <ReplacementOfferPanel
    replaced={NACLI}
    groupName="Division 2b"
    seasonName="Saison 9"
    entryRound={1}
    entryStartsOn="2026-09-02"
    entryEndsOn="2026-09-13"
    missed={0}
  >
    <EmptyStateCard
      title="Erst dem Discord-Server beitreten"
      action={
        <div className="flex flex-wrap items-center gap-3.5">
          <Button size="lg" className="h-11 px-6">
            Server beitreten
          </Button>
          <Button variant="outline">Mitgliedschaft prüfen</Button>
        </div>
      }
    >
      <p>
        Für die Bundesliga musst du Mitglied auf dem Discord-Server der VGC
        Gemeinde sein. Dein Konto ist dort gerade nicht Mitglied. Tritt dem
        Server bei und prüfe deine Mitgliedschaft danach erneut.
      </p>
    </EmptyStateCard>
  </ReplacementOfferPanel>
);

/** Entry at Spieltag 2: the singular "einer Niederlage". */
export const VerpassterSpieltagEineNiederlage = () => (
  <ReplacementOfferPanel
    replaced={NACLI}
    groupName="Division 3a"
    seasonName="Saison 9"
    entryRound={2}
    entryStartsOn="2026-09-14"
    entryEndsOn="2026-09-20"
    missed={1}
  >
    <Form entryRound={2} />
  </ReplacementOfferPanel>
);
