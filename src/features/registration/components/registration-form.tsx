"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FieldError } from "@/components/field-error";
import { InlineLink } from "@/components/links";
import { Tick } from "@/components/tick";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { playerName } from "@/lib/player-name";
import { cn } from "@/lib/utils";
import { register } from "../actions";
import {
  EMPTY_VETERAN_DRAFT,
  firstErrorField,
  PLATFORM_LABELS,
  type Platform,
  type RegistrationDraft,
  type RegistrationField,
  type RegistrationFieldErrors,
  type VeteranDraft,
  validateRegistration,
} from "../registration";

// `numeric` fields are text inputs with a numeric keypad rather than
// `type="number"`: the browser blanks a number input's value for anything it
// cannot parse, so "3b" would reach the validator as an empty field and could
// never be reported as "keine Ziffern". inputMode keeps the mobile keypad.
const VETERAN_FIELDS = [
  {
    key: "prevSeason",
    label: "Letzte Saison",
    placeholder: "z. B. Saison 4",
    numeric: false,
  },
  { key: "prevName", label: "Damaliger Name", placeholder: "", numeric: false },
  {
    key: "prevDivision",
    label: "Division",
    placeholder: "z. B. 3",
    numeric: true,
  },
  {
    key: "prevPlacement",
    label: "Platzierung",
    placeholder: "z. B. 5",
    numeric: true,
  },
] as const;

const PLATFORM_VALUES = Object.keys(PLATFORM_LABELS) as Platform[];

// Where "jump to the first problem" sends focus. Radio groups and the slider
// point at their container; `focusTarget` walks in to the real control.
const FIELD_ANCHORS: Record<RegistrationField, string> = {
  platform: `platform-${PLATFORM_VALUES[0]}`,
  participatedBefore: "participated-ja",
  prevSeason: "prevSeason",
  prevName: "prevName",
  prevDivision: "prevDivision",
  prevPlacement: "prevPlacement",
  skillSelfRating: "skill",
  greatestAchievements: "achievements",
  acceptedRules: "regelwerk-akzeptiert",
};

// Keys that move a slider. Pressing one is an answer even when the value does
// not change, which is the only way a player can deliberately choose 0.
const SLIDER_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

function focusTarget(id: string): HTMLElement | null {
  const anchor = document.getElementById(id);
  if (!anchor) {
    return null;
  }
  if (anchor.tabIndex >= 0) {
    return anchor;
  }
  return anchor.querySelector<HTMLElement>(
    '[tabindex]:not([tabindex="-1"]), input, button',
  );
}

export function RegistrationForm({
  displayName,
  username,
  detectedReturning,
}: {
  displayName: string | null;
  username: string | null;
  detectedReturning: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<RegistrationDraft>({
    platform: "",
    participatedBefore: null,
    veteran: EMPTY_VETERAN_DRAFT,
    skillSelfRating: null,
    greatestAchievements: "",
    acceptedRules: false,
  });
  // Messages stay hidden until the first submit, so the form does not scold
  // anyone for a field they have not reached yet. After that they update live,
  // which is what makes a message disappear the moment it is fixed.
  const [reportErrors, setReportErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<RegistrationFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // A detected veteran answers nothing beyond the base fields; an undetected
  // player must first say whether they have taken part before.
  const isVeteran = detectedReturning || draft.participatedBefore === true;
  const isNew = !detectedReturning && draft.participatedBefore === false;

  const clientErrors = useMemo(
    () => validateRegistration({ ...draft, detectedReturning }),
    [draft, detectedReturning],
  );
  const errors: RegistrationFieldErrors = {
    ...(reportErrors ? clientErrors : {}),
    ...serverErrors,
  };

  // Any edit invalidates what the server told us about the old draft.
  function update(patch: Partial<RegistrationDraft>) {
    setDraft((previous) => ({ ...previous, ...patch }));
    setServerErrors({});
    setFormError(null);
  }

  function updateVeteran(key: keyof VeteranDraft, value: string) {
    setDraft((previous) => ({
      ...previous,
      veteran: { ...previous.veteran, [key]: value },
    }));
    setServerErrors({});
    setFormError(null);
  }

  function reveal(field: RegistrationField) {
    const target = focusTarget(FIELD_ANCHORS[field]);
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  }

  async function submit() {
    setReportErrors(true);
    setServerErrors({});
    setFormError(null);

    const invalid = firstErrorField(clientErrors);
    if (invalid) {
      setFormError("Bitte prüfe die markierten Felder.");
      reveal(invalid);
      return;
    }

    setPending(true);
    const result = await register(draft);
    if (!result.ok) {
      setPending(false);
      setFormError(result.error);
      if (result.fieldErrors) {
        setServerErrors(result.fieldErrors);
        const rejected = firstErrorField(result.fieldErrors);
        if (rejected) {
          reveal(rejected);
        }
      }
      return;
    }
    // Re-render the route so the form gives way to the confirmation view.
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      {detectedReturning ? (
        <p className="text-muted-foreground text-sm">
          Willkommen zurück! Wir haben deine bisherige Teilnahme erkannt. Mehr
          als deine präferierte Plattform brauchen wir nicht von dir.
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="display-name">Anzeigename</Label>
        <Input
          id="display-name"
          value={playerName(displayName, username)}
          disabled
          readOnly
        />
        <p className="text-[13px] text-muted-foreground leading-snug">
          Dein Name auf unserem Discord-Server. Ändere ihn dort, falls nötig.
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Präferierte Plattform</Label>
        <RadioGroup
          className="grid grid-cols-2 gap-2"
          value={draft.platform}
          onValueChange={(value) => update({ platform: value })}
          aria-describedby={errors.platform ? "platform-error" : undefined}
        >
          {PLATFORM_VALUES.map((value) => (
            // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 px-3.5 has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/5",
                errors.platform && "border-destructive/60",
              )}
            >
              <RadioGroupItem
                value={value}
                id={`platform-${value}`}
                aria-invalid={Boolean(errors.platform)}
              />
              <span className="font-medium text-sm">
                {PLATFORM_LABELS[value]}
              </span>
            </label>
          ))}
        </RadioGroup>
        <FieldError id="platform-error" message={errors.platform} />
        <p className="text-[13px] text-muted-foreground leading-snug">
          Beim Seeding versuchen wir, dich mit Spielern derselben Präferenz in
          eine Division einzuteilen. In kleineren Divisionen behalten wir uns
          vor, komplett zufällig zu seeden, um die kompetitive Integrität zu
          wahren.
        </p>
      </div>

      {detectedReturning ? null : (
        <div className="grid gap-2">
          <Label>Hast du schon einmal teilgenommen?</Label>
          <RadioGroup
            className="grid grid-cols-2 gap-2"
            value={
              draft.participatedBefore === null
                ? ""
                : draft.participatedBefore
                  ? "ja"
                  : "nein"
            }
            onValueChange={(value) =>
              update({ participatedBefore: value === "ja" })
            }
            aria-describedby={
              errors.participatedBefore ? "participated-error" : undefined
            }
          >
            {[
              { value: "ja", label: "Ja" },
              { value: "nein", label: "Nein" },
            ].map((option) => (
              // biome-ignore lint/a11y/noLabelWithoutControl: the RadioGroupItem is the control
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 px-3.5 has-data-[state=checked]:border-brand-orange has-data-[state=checked]:bg-brand-orange/5",
                  errors.participatedBefore && "border-destructive/60",
                )}
              >
                <RadioGroupItem
                  value={option.value}
                  id={`participated-${option.value}`}
                  aria-invalid={Boolean(errors.participatedBefore)}
                />
                <span className="font-medium text-sm">{option.label}</span>
              </label>
            ))}
          </RadioGroup>
          <FieldError
            id="participated-error"
            message={errors.participatedBefore}
          />
        </div>
      )}

      {isVeteran && !detectedReturning ? (
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Tick size="s" />
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
              Deine bisherige Teilnahme
            </span>
          </div>
          {/* self-start keeps both inputs of a row on one line when only one of
              them grows a message underneath. */}
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-4">
            {VETERAN_FIELDS.map((field) => (
              <div key={field.key} className="grid gap-2 self-start">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type="text"
                  inputMode={field.numeric ? "numeric" : undefined}
                  placeholder={field.placeholder || undefined}
                  value={draft.veteran[field.key]}
                  onChange={(event) =>
                    updateVeteran(field.key, event.target.value)
                  }
                  aria-invalid={Boolean(errors[field.key])}
                  aria-describedby={
                    errors[field.key] ? `${field.key}-error` : undefined
                  }
                  autoComplete="off"
                />
                <FieldError
                  id={`${field.key}-error`}
                  message={errors[field.key]}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isNew ? (
        <>
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="skill">Wie schätzt du dein VGC-Niveau ein?</Label>
              <span
                className={cn(
                  "shrink-0 font-semibold text-sm",
                  draft.skillSelfRating === null
                    ? "text-muted-foreground"
                    : "text-brand-blue dark:text-white",
                )}
              >
                {draft.skillSelfRating === null
                  ? "noch keine Angabe"
                  : `${draft.skillSelfRating}/10`}
              </span>
            </div>
            <Slider
              id="skill"
              min={0}
              max={10}
              step={1}
              value={[draft.skillSelfRating ?? 0]}
              onValueChange={([value]) =>
                update({ skillSelfRating: value ?? 0 })
              }
              // 0 is a real answer, so "touched" cannot be inferred from the
              // value changing: a player who wants 0 never moves the thumb.
              onPointerDown={() =>
                update({ skillSelfRating: draft.skillSelfRating ?? 0 })
              }
              onKeyDown={(event) => {
                if (SLIDER_KEYS.has(event.key)) {
                  update({ skillSelfRating: draft.skillSelfRating ?? 0 });
                }
              }}
              aria-invalid={Boolean(errors.skillSelfRating)}
              aria-describedby={
                errors.skillSelfRating ? "skill-error" : undefined
              }
            />
            <FieldError id="skill-error" message={errors.skillSelfRating} />
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
              value={draft.greatestAchievements}
              onChange={(event) =>
                update({ greatestAchievements: event.target.value })
              }
              placeholder="Turniere, Platzierungen, Momente, auf die du stolz bist …"
              aria-invalid={Boolean(errors.greatestAchievements)}
              aria-describedby={
                errors.greatestAchievements ? "achievements-error" : undefined
              }
            />
            <FieldError
              id="achievements-error"
              message={errors.greatestAchievements}
            />
          </div>
        </>
      ) : null}

      {/* target="_blank": the form is long, and losing a half-filled one to
          read the rules is how people abandon a registration. */}
      <div className="grid gap-2">
        <label
          htmlFor="regelwerk-akzeptiert"
          className="flex min-h-11 cursor-pointer items-start gap-3 text-[13px] leading-[1.55]"
        >
          <Checkbox
            id="regelwerk-akzeptiert"
            checked={draft.acceptedRules}
            onCheckedChange={(value) =>
              update({ acceptedRules: value === true })
            }
            className="mt-0.5"
            aria-invalid={Boolean(errors.acceptedRules)}
            aria-describedby={
              errors.acceptedRules ? "regelwerk-error" : undefined
            }
          />
          <span>
            Ich habe das{" "}
            <InlineLink href="/regelwerk" target="_blank" rel="noreferrer">
              Regelwerk der VGC Bundesliga
            </InlineLink>{" "}
            gelesen und akzeptiere es.
          </span>
        </label>
        <FieldError id="regelwerk-error" message={errors.acceptedRules} />
      </div>

      <div className="flex flex-col gap-2">
        {/* The summary answers the click even when the offending field is
            scrolled out of view. */}
        {formError ? (
          <p role="alert" className="text-destructive text-sm">
            {formError}
          </p>
        ) : null}
        <div>
          <Button
            type="button"
            size="lg"
            className="h-11 px-6"
            disabled={pending}
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
