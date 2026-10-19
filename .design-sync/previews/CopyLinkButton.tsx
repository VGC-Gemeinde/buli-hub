import { CopyLinkButton, Tick } from "buli-hub";

/* Staff's share-a-link control: the URL in a muted `code` chip plus an outline
 * button. The button has one other state — "Kopiert" with a check, for two
 * seconds after a successful clipboard write — which needs a real click and a
 * secure context, so it cannot be rendered statically. Only the resting state
 * is shown. */

/** The canonical use: the registration link staff post in Discord. */
export function Anmeldelink() {
  return <CopyLinkButton url="https://buli.vgc-gemeinde.de/anmeldung" />;
}

/** In place: the staff overview's season card while the registration is open
 *  (`SeasonCard`, open state). The card itself is not in the bundle (it
 *  reaches a server action), so its anatomy is rebuilt here from
 *  `registration-status.tsx`; the copy button is the real one. */
export function ImStaffPanel() {
  return (
    <div className="flex max-w-xl flex-col gap-2 rounded-lg border px-6 py-5">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        <div className="font-bold font-heading text-2xl text-brand-blue uppercase tracking-[0.02em] dark:text-white">
          Saison 9
        </div>
        <div className="flex items-center gap-2">
          <Tick size="s" color="orange" />
          <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
            Anmeldung offen
          </span>
        </div>
      </div>
      <p className="text-muted-foreground text-sm">
        Schließt automatisch am 22. März 2026 um 23:59.
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <p className="text-[13px] text-muted-foreground">Anmeldelink:</p>
        <CopyLinkButton url="https://buli.vgc-gemeinde.de/anmeldung" />
      </div>
    </div>
  );
}
