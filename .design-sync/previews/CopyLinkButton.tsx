import { CopyLinkButton, SectionHeader } from "buli-hub";

/* Staff's share-a-link control: the URL in a muted `code` chip plus an outline
 * button. The button has one other state — „Kopiert" with a check, for two
 * seconds after a successful clipboard write — which needs a real click and a
 * secure context, so it cannot be rendered statically. Only the resting state
 * is shown. */

/** The canonical use: the registration link staff post in Discord. */
export function Anmeldelink() {
  return <CopyLinkButton url="https://buli.vgc-gemeinde.de/anmeldung" />;
}

/** In its panel: the staff section that hands out a match link. */
export function ImStaffPanel() {
  return (
    <div className="flex max-w-[560px] flex-col gap-3">
      <SectionHeader tickColor="navy" meta="Nur für Staff sichtbar">
        Link teilen
      </SectionHeader>
      <p className="text-[13px] text-muted-foreground">
        Direktlink zur Match-Seite — Spieler können ihn ohne Login öffnen.
      </p>
      {/* Given a bounded container the URL chip ellipsises and the button keeps
          its full width — the reason for the `truncate`/`shrink-0` pair. */}
      <CopyLinkButton url="https://buli.vgc-gemeinde.de/match/1042/melden" />
    </div>
  );
}
