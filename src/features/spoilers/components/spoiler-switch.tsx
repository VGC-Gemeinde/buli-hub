"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { spoilersOffCookie } from "../spoilers";

// The global spoiler switch on the public overview. Checked = protection on
// (the default). Flipping it writes the per-browser cookie — so the match
// page renders the same state server-side — and lifts the new value to the
// page state for an immediate update.
export function SpoilerSwitch({
  spoilersOff,
  onChange,
}: {
  spoilersOff: boolean;
  onChange: (off: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id="spoiler-switch"
        checked={!spoilersOff}
        onCheckedChange={(checked) => {
          const off = !checked;
          // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is not supported everywhere; a plain cookie write is the compatible choice
          document.cookie = spoilersOffCookie(off);
          onChange(off);
        }}
      />
      <Label
        htmlFor="spoiler-switch"
        className="cursor-pointer whitespace-nowrap font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.12em]"
      >
        Spoiler-Schutz
      </Label>
    </div>
  );
}
