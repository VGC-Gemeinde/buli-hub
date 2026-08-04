"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { spoilersOffCookie } from "../spoilers";

// The global spoiler switch in the public overview's title row. Checked =
// protection on (the default). Flipping it writes the per-browser cookie — so
// the match page renders the same state server-side — and lifts the new value
// to the page state.
//
// On-track: brand-blue in light (navy on white reads on its own, and matches
// the „Spoiler-Schutz" label). In dark, brand-blue sits at nearly the page
// background's luminance, so it falls back to the design-system default orange
// track (design/SPOILER-SCHUTZ.md §2.1). The white thumb and the off-state are
// the component defaults, readable in both modes.
export function SpoilerSwitch({
  spoilersOff,
  onChange,
}: {
  spoilersOff: boolean;
  onChange: (off: boolean) => void;
}) {
  return (
    <div
      className="flex items-center gap-2"
      title="Verdeckt fremde Ergebnisse auf der ganzen Seite"
    >
      <Switch
        id="spoiler-switch"
        checked={!spoilersOff}
        className="data-checked:bg-brand-blue dark:data-checked:bg-primary"
        onCheckedChange={(checked) => {
          const off = !checked;
          // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is not supported everywhere; a plain cookie write is the compatible choice
          document.cookie = spoilersOffCookie(off);
          onChange(off);
        }}
      />
      <Label
        htmlFor="spoiler-switch"
        className="cursor-pointer whitespace-nowrap font-semibold text-[13.5px] text-brand-blue dark:text-white"
      >
        Spoiler-Schutz
      </Label>
    </div>
  );
}
