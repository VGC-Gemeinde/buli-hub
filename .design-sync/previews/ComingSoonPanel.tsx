import { ComingSoonPanel } from "buli-hub";

/* One of the three pre-season states of the Spieler-Dashboard (§4.7
 * `keine_saison`): between seasons there is no schedule and no pairing, so the
 * page reports that calmly instead of showing an empty table. Takes no props —
 * the copy is the state. Ported from the dev/ui gallery specimen
 * („Vorsaison: keine Saison"). */

/* Where it sits: the narrow `max-w-[640px]` shell every non-in-season state of
 * /spieler uses — the site header's 3px orange accent line, then the page title,
 * then the panel as the page's whole content. Headings carry no size of their
 * own in this system (h1–h3 only set case, weight and tracking), so the page
 * title always names its step of the type scale explicitly. */
export function AufDemDashboard() {
  return (
    <div className="flex flex-col">
      <div className="h-[3px] bg-brand-orange" />
      <div className="mx-auto w-full max-w-[640px] px-6 py-12">
        <h1 className="mb-9 text-[40px] text-brand-blue dark:text-white">
          Spieler-Dashboard
        </h1>
        <ComingSoonPanel />
      </div>
    </div>
  );
}

export function KeineSaison() {
  return <ComingSoonPanel />;
}
