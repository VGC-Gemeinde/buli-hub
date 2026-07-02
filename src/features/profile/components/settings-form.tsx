"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfile } from "../actions";
import { REGIONS } from "../regions";
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
    <section aria-label="Einstellungen" className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl">Einstellungen</h2>
        <SaveIndicator status={status} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="twitter-handle">Twitter/X-Handle</Label>
        <Input
          id="twitter-handle"
          value={values.twitterHandle}
          onChange={(event) => change({ twitterHandle: event.target.value })}
          placeholder="benutzername"
          autoComplete="off"
        />
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
            {REGIONS.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
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
      </div>
    </section>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
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
