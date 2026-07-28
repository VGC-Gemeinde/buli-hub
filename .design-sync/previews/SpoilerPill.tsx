import { SpoilerPill } from "buli-hub";

/* The shared masking idiom (design/SPOILER-SCHUTZ.md §1.1): a hidden value is
 * drawn IN PLACE, at the size the real value would occupy, as a quiet
 * placeholder — never a dark chip, never a cover card. The pill carries no
 * size of its own, so every use site sets it: 40×12 in an overview score slot,
 * 88×13 next to a game's „Sieger:" label. On its own it is a blank rounded
 * rectangle, which is why all three cards show it inside its real row. */

const noop = () => {};

const ROW = "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm";
const SLOT =
  "relative flex w-12 shrink-0 items-center justify-center font-semibold text-muted-foreground text-xs tabular-nums";

function MatchRow({
  playerA,
  playerB,
  children,
}: {
  playerA: string;
  playerB: string;
  children: React.ReactNode;
}) {
  return (
    <div className={ROW}>
      <span className="min-w-0 flex-1 truncate font-medium">{playerA}</span>
      <span className={SLOT}>{children}</span>
      <span className="flex min-w-0 flex-1 flex-row-reverse truncate font-medium">
        {playerB}
      </span>
    </div>
  );
}

/** Overview score slot (§2.2): the 40×12 pill in the fixed `w-12` box, next to
 *  an unplayed „offen" row so the reserved footprint is visible. */
export function ErgebnisSlot() {
  return (
    <div className="flex w-[560px] flex-col gap-2">
      <MatchRow playerA="Testerino" playerB="Falinks">
        <SpoilerPill
          title="Ergebnis verdeckt — antippen zum Aufdecken"
          onReveal={noop}
          className="h-3 w-10"
        />
      </MatchRow>
      <MatchRow playerA="Blaubeerkuchen" playerB="Wooloo">
        <SpoilerPill
          title="Ergebnis verdeckt — antippen zum Aufdecken"
          onReveal={noop}
          className="h-3 w-10"
        />
      </MatchRow>
      <MatchRow playerA="Grafaiai" playerB="Kilowattrel">
        offen
      </MatchRow>
    </div>
  );
}

/** Match page, „Spiele" section (§3.5): the 88×13 pill masks each game's
 *  winner — every game reveals on its own, the replay links stay live. */
export function SiegerZeile() {
  return (
    <div className="flex w-[560px] flex-col gap-2">
      <div className="flex items-baseline justify-end text-[12.5px] text-muted-foreground">
        Replays spoilerfrei ansehen
      </div>
      {[1, 2, 3].map((nummer) => (
        <div
          key={nummer}
          className="flex items-center gap-3.5 rounded-lg border px-4 py-3"
        >
          <span className="w-[58px] shrink-0 whitespace-nowrap font-semibold text-muted-foreground text-xs uppercase tracking-[0.08em]">
            Spiel {nummer}
          </span>
          <span className="flex min-h-[31px] flex-1 items-center gap-2 font-semibold text-sm">
            <span className="text-muted-foreground">Sieger:</span>
            <SpoilerPill
              title="Sieger verdeckt — antippen zum Aufdecken"
              onReveal={noop}
              className="h-[13px] w-[88px]"
            />
          </span>
          <span className="rounded-md border px-3 py-1.5 font-semibold text-[13px]">
            Replay ansehen ↗
          </span>
        </div>
      ))}
    </div>
  );
}

/** The zero-relayout promise (§1.4): the same row covered and revealed. The
 *  pill occupies exactly the score's footprint, so revealing moves nothing —
 *  only the winner's name turns bold. */
export function VerdecktUndAufgedeckt() {
  return (
    <div className="flex w-[560px] flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted-foreground">Verdeckt</span>
        <MatchRow playerA="Testerino" playerB="Falinks">
          <SpoilerPill
            title="Ergebnis verdeckt — antippen zum Aufdecken"
            onReveal={noop}
            className="h-3 w-10"
          />
        </MatchRow>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted-foreground">Aufgedeckt</span>
        <div className={ROW}>
          <span className="min-w-0 flex-1 truncate font-semibold">
            Testerino
          </span>
          <span className={SLOT}>
            <span className="text-foreground">2 : 1</span>
          </span>
          <span className="flex min-w-0 flex-1 flex-row-reverse truncate font-medium">
            Falinks
          </span>
        </div>
      </div>
    </div>
  );
}
