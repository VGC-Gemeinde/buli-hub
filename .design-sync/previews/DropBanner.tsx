import { DropBanner } from "buli-hub";

/* The match-page strip for a drop-decided match. It takes four required props
 * and builds its sentence from them — with no props the copy reads
 * „undefined wurde gedroppt", so always pass both names and the flags.
 *
 * Pawmi is the fixtures' dropped player (`STANDINGS`, `dropped: true`); a
 * single drop always counts as a 2:0 free win for the opponent, both drops as
 * a double loss. */

/** The common case: one player dropped, the opponent gets the free win. */
export function Freewin() {
  return (
    <div className="max-w-[640px]">
      <DropBanner
        playerAName="Pawmi"
        playerBName="Testerino"
        aDropped
        bDropped={false}
      />
    </div>
  );
}

/** Both participants dropped — nobody is awarded the win. */
export function Doppelniederlage() {
  return (
    <div className="max-w-[640px]">
      <DropBanner playerAName="Pawmi" playerBName="Falinks" aDropped bDropped />
    </div>
  );
}

/** In place on the match page: the banner sits above the result, and the
 *  already-played content below it stays readable as history. */
export function AufDerMatchseite() {
  return (
    <div className="max-w-[640px]">
      <span className="font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.12em]">
        Ergebnis · Spieltag 3 · Division 1a · Saison 1
      </span>
      <h1 className="mt-2 mb-6 font-bold font-heading text-[34px] text-brand-blue uppercase leading-[1.1] dark:text-white">
        Freewin für Testerino
      </h1>
      <DropBanner
        playerAName="Pawmi"
        playerBName="Testerino"
        aDropped
        bDropped={false}
      />
      <div className="flex items-center justify-center gap-8 rounded-xl border px-5 py-6">
        <div className="flex flex-col items-center gap-1">
          <span className="font-medium text-sm">Pawmi</span>
          <span className="font-heading text-[40px] text-muted-foreground leading-none">
            0
          </span>
        </div>
        <span className="text-[26px] text-muted-foreground">:</span>
        <div className="flex flex-col items-center gap-1">
          <span className="font-semibold text-sm">Testerino</span>
          <span className="font-heading text-[40px] text-brand-blue leading-none dark:text-white">
            2
          </span>
        </div>
      </div>
    </div>
  );
}
