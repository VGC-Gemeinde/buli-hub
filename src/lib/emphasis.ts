// The loud „do not skim past" surface: a 2px tone border over a 12% tone wash.
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
