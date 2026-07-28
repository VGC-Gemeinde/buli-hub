import { ControlPill } from "buli-hub";

/* The collaborative lock of the Divisions-Einteilung, as a status pill that sits
 * at the right end of the page title row (breadcrumb · tick + h1 + season ·
 * `flex-1` spacer · pill). Seeding is a live staff meeting: the page opens
 * read-only for everyone and exactly one person takes control to edit, so the
 * pill answers
 * „who is driving?" without spending a chrome row on it. Three visually distinct
 * tones — muted while the seat is free, amber while someone else holds it,
 * orange while it is yours. A free or stale lock is taken with a light
 * confirmation; a live lock held by someone else needs an explicit takeover.
 *
 * The pill is `flex shrink-0`, sized by its content, so it needs a flex parent —
 * as a lone block child it stretches to the full width and stops reading as a
 * pill.
 *
 * The confirmation dialogs are portal overlays owned by internal state, so no
 * prop opens them (`Dialog` covers that). `state="stale"` takes the same branch
 * as `"free"` — an expired heartbeat is a free seat — so it gets no cell of its
 * own. Ported from the dev/ui gallery („Seeding: Steuerungs-Pill"). */

export function BeobachterNiemandSteuert() {
  return (
    <div className="flex">
      <ControlPill
        state="free"
        holderName={null}
        pending={false}
        onAcquire={() => {}}
        onRelease={() => {}}
      />
    </div>
  );
}

export function BeobachterJemandSteuert() {
  return (
    <div className="flex">
      <ControlPill
        state="held-by-other"
        holderName="Testerino"
        pending={false}
        onAcquire={() => {}}
        onRelease={() => {}}
      />
    </div>
  );
}

export function DuSteuerst() {
  return (
    <div className="flex">
      <ControlPill
        state="self"
        holderName="annegret"
        pending={false}
        onAcquire={() => {}}
        onRelease={() => {}}
      />
    </div>
  );
}
