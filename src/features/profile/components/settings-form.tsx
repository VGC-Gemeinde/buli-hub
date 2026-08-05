"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "@/components/section-header";
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
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
  hasCaptureCard: boolean;
};

type SettingsFormProps = {
  initial: {
    twitterHandle: string;
    blueskyHandle: string;
    origin: string | null;
    hasCaptureCard: boolean;
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
    hasCaptureCard: initial.hasCaptureCard,
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
        hasCaptureCard: next.hasCaptureCard,
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
      <div className="flex flex-col gap-3">
        <SectionHeader meta={<SaveIndicator status={status} />}>
          Für die Orga
        </SectionHeader>
        <p className="text-muted-foreground text-sm leading-normal">
          Alle Angaben hier sind freiwillig. Sie helfen uns bei
          Social-Media-Posts und Liga-Content.
        </p>
      </div>

      {/* Twitter + Bluesky sit side by side; the shared helper spans both
          columns and the grid collapses to one column on narrow screens. */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="twitter-handle">Twitter/X-Handle</Label>
          {/* Input look-alike wrapper so the static @ prefix sits inside the
              field; height matches the 38px inputs exactly. */}
          <div className="flex h-[38px] w-full items-center rounded-lg border border-input bg-transparent px-3 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
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
            className="h-[38px]"
          />
        </div>

        <p className="text-[13px] text-muted-foreground leading-snug sm:col-span-2">
          Über deine Handles können wir dich in Social-Media-Posts erwähnen.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="origin">Herkunft</Label>
        <Select
          value={values.originSelect}
          onValueChange={(value) => change({ originSelect: value })}
        >
          <SelectTrigger
            id="origin"
            className="w-full data-[size=default]:h-[38px]"
          >
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
            className="h-[38px]"
          />
        ) : null}
        <p className="text-[13px] text-muted-foreground leading-snug">
          Zeigen wir in Content wie YouTube-Videos oder Twitch-Streams.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 border-t pt-5">
        <div className="grid gap-1">
          <Label htmlFor="capture-card">Capture Card</Label>
          <p className="text-[13px] text-muted-foreground leading-snug">
            Du besitzt eine Capture Card, um Gameplay aufzunehmen.
          </p>
        </div>
        {/* Track 40×22, white 18px knob, orange when on (§4.1) — that is the
            shared Switch's `lg` size. This used to be patched in from here with
            className overrides, but the track dimensions sit behind
            `data-[size=…]` selectors that outrank plain utilities, so only the
            thumb rules landed and the knob rendered outside its rail. */}
        <Switch
          id="capture-card"
          size="lg"
          checked={values.hasCaptureCard}
          onCheckedChange={(checked) => change({ hasCaptureCard: checked })}
        />
      </div>
    </section>
  );
}

// Save indicator sitting in the section-header meta slot (§4.1): a 6px dot +
// 13px label. idle renders nothing; saving = orange dot, saved = green dot,
// error = destructive dot and destructive text.
export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") {
    return null;
  }
  const dot =
    status === "saving"
      ? "bg-brand-orange"
      : status === "saved"
        ? "bg-[oklch(0.55_0.13_155)]"
        : "bg-destructive";
  const label =
    status === "saving"
      ? "Speichern…"
      : status === "saved"
        ? "Gespeichert"
        : "Fehler beim Speichern";
  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-[7px] text-[13px]",
        status === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}
