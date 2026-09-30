// The loud "do not skim past" surface: a 2px tone border over a 12% tone wash.
// The wash is the same weight in light and dark on purpose — 5% orange/red
// reads on white but disappears on the dark navy background, so both modes use
// the heavier value to pop equally. Shared by the registration/dashboard
// profile hint, the MotW-selection todo and the overdue-match rows so the
// treatment stays identical wherever it appears.
//
// `orange` is a nudge or a not-yet-urgent warning; `destructive` is urgent
// (overdue, running Spieltag without a MotW). Compose through `cn` so the 2px
// border overrides any base `border` on the element.
export type EmphasisTone = "orange" | "destructive";

export function emphasisSurface(tone: EmphasisTone): string {
  return tone === "orange"
    ? "border-2 border-brand-orange bg-brand-orange/12"
    : "border-2 border-destructive bg-destructive/12";
}

// The two hover answers for things that react to a click, readable in light
// and dark alike (a half-transparent orange border alone vanishes on white):
//
// `hoverCard`: a bordered card or row that is a link or a button (stat tiles,
// match rows, pager steps). The border turns fully orange over a faint
// orange wash.
export const hoverCard =
  "transition-colors hover:border-brand-orange hover:bg-brand-orange/[0.06]";

// `hoverRow`: a row without a border of its own inside a card or list (the
// Spielplan rows, picker options, sheet rows): the full muted background.
export const hoverRow = "transition-colors hover:bg-muted";
