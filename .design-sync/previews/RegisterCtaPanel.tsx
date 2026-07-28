import { ParticipantList, RegisterCtaPanel } from "buli-hub";
import { ROSTER } from "./_fixtures";

/* The second pre-season state (§4.7 `anmeldung_offen`): the registration is
 * open and the viewer has not signed up yet. The only one of the three panels
 * that carries an action, so it is the orange-tinted variant of the empty-state
 * card — `border-brand-orange/40 bg-brand-orange/5` plus the primary
 * „Jetzt anmelden" button. Ported from the dev/ui gallery specimen. */

export function AnmeldungLaeuft() {
  return <RegisterCtaPanel seasonName="Saison 9" />;
}

/* Where the panel actually sits: the dashboard shows the CTA and, underneath
 * it, who has already signed up — so the decision has social context. */
export function VorsaisonDashboard() {
  return (
    <div className="flex flex-col">
      <div className="h-[3px] bg-brand-orange" />
      <div className="mx-auto w-full max-w-[640px] px-6 py-12">
        <h1 className="mb-9 text-[40px] text-brand-blue dark:text-white">
          Spieler-Dashboard
        </h1>
        <RegisterCtaPanel seasonName="Saison 9" />
        <ParticipantList players={ROSTER} seasonName="Saison 9" />
      </div>
    </div>
  );
}
