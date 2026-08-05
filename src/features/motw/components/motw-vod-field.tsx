"use client";

import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveMotwYoutubeUrl } from "../actions";

// The VOD link editor for one pick — available for every round, including past
// ones, because uploads lag the Spieltag. Saving an empty field removes the
// link. A set link collapses to a chip; „Ändern" opens the input again.
export function MotwVodField({
  round,
  youtubeUrl,
  onError,
}: {
  round: number;
  youtubeUrl: string | null;
  onError: (error: string | null) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(youtubeUrl ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = value.trim() !== (youtubeUrl ?? "");

  async function save() {
    setSaving(true);
    onError(null);
    const trimmed = value.trim();
    const result = await saveMotwYoutubeUrl({
      round,
      url: trimmed === "" ? null : trimmed,
    });
    setSaving(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (youtubeUrl && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-2.5">
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 items-center gap-2 rounded-lg bg-brand-orange px-3.5 py-[7px] font-semibold text-[13px] text-white transition-colors hover:bg-[#ff8d24]"
        >
          <Play aria-hidden className="size-3.5 shrink-0 fill-current" />
          <span className="truncate">Auf YouTube ansehen</span>
        </a>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setEditing(true)}
        >
          VOD-Link ändern
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`youtube-${round}`} className="text-[13px]">
        YouTube-VOD
      </Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id={`youtube-${round}`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          autoComplete="off"
          className="min-w-[220px] flex-1"
        />
        <Button type="button" disabled={!dirty || saving} onClick={save}>
          {saving ? "Wird gespeichert…" : "Speichern"}
        </Button>
        {youtubeUrl ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setValue(youtubeUrl);
              setEditing(false);
              onError(null);
            }}
          >
            Abbrechen
          </Button>
        ) : null}
      </div>
      <p className="text-[12px] text-muted-foreground">
        {youtubeUrl
          ? "Feld leeren und speichern entfernt den Link."
          : "Noch kein VOD verlinkt."}
      </p>
    </div>
  );
}
