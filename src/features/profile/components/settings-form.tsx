"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfile } from "../actions";
import { GERMAN_STATES, NEIGHBOR_COUNTRIES } from "../regions";
import { originToFormState } from "../settings";

type SaveStatus = "idle" | "saving" | "saved" | "error";

// Sentinels for the two non-region select entries (Radix Select items must
// have non-empty values).
const NONE = "__none__";
const OTHER = "__other__";

type FormValues = {
  twitterHandle: string;
  blueskyHandle: string;
  originSelect: string;
  originText: string;
};

type SettingsFormProps = {
  initial: {
    twitterHandle: string;
    blueskyHandle: string;
    origin: string | null;
  };
};

export function SettingsForm({ initial }: SettingsFormProps) {
  const originState = originToFormState(initial.origin);
  const [values, setValues] = useState<FormValues>({
    twitterHandle: initial.twitterHandle,
    blueskyHandle: initial.blueskyHandle,
    originSelect:
      originState.kind === "region"
        ? originState.region
        : originState.kind === "other"
          ? OTHER
          : NONE,
    originText: originState.kind === "other" ? originState.text : "",
  });
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function change(patch: Partial<FormValues>) {
    const next = { ...values, ...patch };
    setValues(next);
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), 600);
  }

  async function save(next: FormValues) {
    const id = ++requestId.current;
    const origin =
      next.originSelect === OTHER
        ? next.originText
        : next.originSelect === NONE
          ? ""
          : next.originSelect;
    try {
      const result = await updateProfile({
        twitterHandle: next.twitterHandle,
        blueskyHandle: next.blueskyHandle,
        origin,
      });
      // A newer edit is already in flight — its result wins.
      if (id !== requestId.current) return;
      setStatus(result.ok ? "saved" : "error");
    } catch {
      if (id === requestId.current) setStatus("error");
    }
  }

  return (
    <section aria-label="Für die Orga" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between border-b pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-[9px] w-[18px] -skew-x-[18deg] bg-brand-orange" />
            <h2 className="text-[26px] tracking-[0.03em]">Für die Orga</h2>
          </div>
          <SaveIndicator status={status} />
        </div>
        <p className="text-muted-foreground text-sm">
          Alle Angaben hier sind freiwillig.
        </p>
      </div>

      <div className="flex flex-col gap-3.5">
        <div className="grid gap-2">
          <Label htmlFor="twitter-handle">Twitter/X-Handle</Label>
          {/* Input look-alike wrapper so the static @ prefix sits inside the field. */}
          <div className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
            <span className="text-base text-muted-foreground md:text-sm">
              @
            </span>
            <input
              id="twitter-handle"
              value={values.twitterHandle}
              onChange={(event) =>
                change({ twitterHandle: event.target.value })
              }
              placeholder="benutzername"
              autoComplete="off"
              className="h-full w-full min-w-0 bg-transparent pl-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bluesky-handle">Bluesky-Handle</Label>
          <Input
            id="bluesky-handle"
            value={values.blueskyHandle}
            onChange={(event) => change({ blueskyHandle: event.target.value })}
            placeholder="name.bsky.social"
            autoComplete="off"
          />
        </div>

        <p className="text-[13px] text-muted-foreground leading-snug">
          Über deine Handles können wir dich in Social-Media-Posts erwähnen.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="origin">Herkunft</Label>
        <Select
          value={values.originSelect}
          onValueChange={(value) => change({ originSelect: value })}
        >
          <SelectTrigger id="origin" className="w-full">
            <SelectValue placeholder="Bitte wählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Keine Angabe</SelectItem>
            <SelectGroup>
              <SelectLabel>Bundesländer</SelectLabel>
              {GERMAN_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Weitere Länder</SelectLabel>
              {NEIGHBOR_COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectItem value={OTHER}>Andere</SelectItem>
          </SelectContent>
        </Select>
        {values.originSelect === OTHER ? (
          <Input
            value={values.originText}
            onChange={(event) => change({ originText: event.target.value })}
            placeholder="Woher kommst du?"
            aria-label="Herkunft (Freitext)"
            autoComplete="off"
          />
        ) : null}
        <p className="text-[13px] text-muted-foreground leading-snug">
          Zeigen wir in Content wie YouTube-Videos oder Twitch-Streams.
        </p>
      </div>
    </section>
  );
}

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") {
    return null;
  }
  if (status === "error") {
    return (
      <span aria-live="polite" className="text-destructive text-sm">
        Fehler beim Speichern
      </span>
    );
  }
  return (
    <span aria-live="polite" className="text-muted-foreground text-sm">
      {status === "saving" ? "Speichern…" : "Gespeichert"}
    </span>
  );
}
