"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { register } from "../actions";
import { PLATFORM_LABELS, type Platform } from "../registration";

const VETERAN_FIELDS = [
  { key: "prevSeason", label: "Letzte Saison" },
  { key: "prevName", label: "Damaliger Name" },
  { key: "prevDivision", label: "Division" },
  { key: "prevPlacement", label: "Platzierung" },
] as const;

type VeteranKey = (typeof VETERAN_FIELDS)[number]["key"];

export function RegistrationForm({
  displayName,
  detectedReturning,
}: {
  displayName: string | null;
  detectedReturning: boolean;
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform | "">("");
  const [participatedBefore, setParticipatedBefore] = useState<boolean | null>(
    null,
  );
  const [veteran, setVeteran] = useState<Record<VeteranKey, string>>({
    prevSeason: "",
    prevName: "",
    prevDivision: "",
    prevPlacement: "",
  });
  const [skillSelfRating, setSkillSelfRating] = useState(0);
  const [greatestAchievements, setGreatestAchievements] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // A detected veteran answers nothing beyond the base fields; an undetected
  // player must first say whether they have taken part before.
  const isVeteran = detectedReturning || participatedBefore === true;
  const isNew = !detectedReturning && participatedBefore === false;
  const veteranComplete = VETERAN_FIELDS.every(
    (field) => veteran[field.key].trim() !== "",
  );

  const canSubmit =
    platform !== "" &&
    !pending &&
    (detectedReturning ||
      (participatedBefore !== null &&
        (participatedBefore ? veteranComplete : true)));

  async function submit() {
    if (platform === "") {
      return;
    }
    setPending(true);
    setError(null);
    const result = await register({
      platform,
      participatedBefore: detectedReturning ? null : participatedBefore,
      veteran: isVeteran && !detectedReturning ? veteran : undefined,
      newPlayer: isNew ? { skillSelfRating, greatestAchievements } : undefined,
    });
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    // Re-render the route so the form gives way to the confirmation view.
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      {detectedReturning ? (
        <p className="text-muted-foreground text-sm">
          Willkommen zurück! Wir haben deine bisherige Teilnahme erkannt — mehr
          als Plattform brauchen wir nicht von dir.
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="display-name">Anzeigename</Label>
        <Input id="display-name" value={displayName ?? ""} disabled readOnly />
        <p className="text-[13px] text-muted-foreground leading-snug">
          Dein Name auf unserem Discord-Server. Ändere ihn dort, falls nötig.
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Plattform</Label>
        <RadioGroup
          className="grid grid-cols-2 gap-2"
          value={platform}
          onValueChange={(value) => setPlatform(value as Platform)}
        >
          {(Object.keys(PLATFORM_LABELS) as Platform[]).map((value) => (
            // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 px-3.5 has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/5"
            >
              <RadioGroupItem value={value} id={`platform-${value}`} />
              <span className="font-medium text-sm">
                {PLATFORM_LABELS[value]}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {detectedReturning ? null : (
        <div className="grid gap-2">
          <Label>Hast du schon einmal teilgenommen?</Label>
          <RadioGroup
            className="grid grid-cols-2 gap-2"
            value={
              participatedBefore === null
                ? ""
                : participatedBefore
                  ? "ja"
                  : "nein"
            }
            onValueChange={(value) => setParticipatedBefore(value === "ja")}
          >
            {[
              { value: "ja", label: "Ja" },
              { value: "nein", label: "Nein" },
            ].map((option) => (
              // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 px-3.5 has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/5"
              >
                <RadioGroupItem
                  value={option.value}
                  id={`participated-${option.value}`}
                />
                <span className="font-medium text-sm">{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
      )}

      {isVeteran && !detectedReturning ? (
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <div className="h-[7px] w-3.5 -skew-x-[18deg] bg-brand-orange" />
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
              Deine bisherige Teilnahme
            </span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-4">
            {VETERAN_FIELDS.map((field) => (
              <div key={field.key} className="grid gap-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  value={veteran[field.key]}
                  onChange={(event) =>
                    setVeteran((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isNew ? (
        <>
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="skill">Wie schätzt du dein VGC-Niveau ein?</Label>
              <span className="font-semibold text-brand-blue text-sm dark:text-white">
                {skillSelfRating}/10
              </span>
            </div>
            <Slider
              id="skill"
              min={0}
              max={10}
              step={1}
              value={[skillSelfRating]}
              onValueChange={([value]) => setSkillSelfRating(value ?? 0)}
            />
            <p className="text-[13px] text-muted-foreground leading-snug">
              0 = blutiger Anfänger · 5 = konstanter 4-4-Spieler auf Regionals ·
              10 = VGC-Weltmeister
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="achievements">
              Größte VGC-Erfolge{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="achievements"
              value={greatestAchievements}
              onChange={(event) => setGreatestAchievements(event.target.value)}
              placeholder="Turniere, Platzierungen, Momente, auf die du stolz bist …"
            />
          </div>
        </>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex flex-col gap-2">
        <div>
          <Button
            type="button"
            size="lg"
            disabled={!canSubmit}
            onClick={submit}
          >
            {pending ? "Wird gesendet…" : "Anmeldung absenden"}
          </Button>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Du kannst dich bis zum Anmeldeschluss jederzeit wieder abmelden.
        </p>
      </div>
    </div>
  );
}
