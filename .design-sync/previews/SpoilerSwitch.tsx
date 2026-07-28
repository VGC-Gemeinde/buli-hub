import { SpoilerSwitch, Tick } from "buli-hub";

/* The global spoiler switch from the public overview's title row
 * (design/SPOILER-SCHUTZ.md §2.1). Note the inverted prop: it takes
 * `spoilersOff`, and checked = protection ON, which is the default. Flipping
 * it writes the per-browser cookie so the match page renders the same state
 * server-side. */

const noop = () => {};

/** Default: protection on, navy track. Foreign results stay covered. */
export function SchutzAktiv() {
  return <SpoilerSwitch spoilersOff={false} onChange={noop} />;
}

/** Turned off: every masked row reveals — except the Match of the Week, which
 *  ignores the switch by design. */
export function SchutzAus() {
  return <SpoilerSwitch spoilersOff onChange={noop} />;
}

/** Its real home: right-aligned in the overview's title row, after the
 *  Spieltag label. */
export function InDerTitelzeile() {
  return (
    <div className="flex max-w-[760px] flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <Tick size="l" />
        <h1 className="text-[28px] text-brand-blue leading-[1.1] dark:text-white">
          VGC Bundesliga
        </h1>
        <span className="whitespace-nowrap font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.12em]">
          · Saison 1
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
        <span className="font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.12em]">
          Spieltag 2 / 4
        </span>
        <SpoilerSwitch spoilersOff={false} onChange={noop} />
      </div>
    </div>
  );
}
