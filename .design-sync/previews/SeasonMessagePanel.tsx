import { SeasonMessagePanel } from "buli-hub";

/* The generic informational pre-season state (§4.7 `nicht_platziert`): the
 * dashboard has nothing personal to show and says why. Unlike its two siblings
 * the copy is passed in, so the same panel carries every "you are not in this
 * one" message: a closed registration, a season the viewer was not placed in,
 * a replacement offer that came too late. The copy is the app's own
 * (`src/app/spieler/page.tsx`). Always `informational` (neutral tick, no action):
 * there is nothing for the player to do here. */

export function AnmeldungGeschlossen() {
  return (
    <SeasonMessagePanel
      title="Du bist in dieser Saison nicht dabei"
      body="Die Anmeldung ist bereits geschlossen. Die nächste Chance kommt. Schau im Discord vorbei."
    />
  );
}

export function NichtPlatziert() {
  return (
    <SeasonMessagePanel
      title="Du bist in der laufenden Saison nicht dabei"
      body="Für diese Saison liegt keine Einteilung für dich vor. Die nächste Anmeldung wird im Discord angekündigt."
    />
  );
}

/* In place: the narrow `max-w-[640px]` shell /spieler uses for every
 * non-in-season state (its `Shell`, below the site header, which is not part
 * of the bundle). Here a replacement offer whose entry round has passed: the
 * panel is the page's whole content. */
export function ImDashboard() {
  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-[640px] px-6 py-12 sm:px-8">
        <h1 className="mb-9 text-[32px] text-brand-blue sm:text-[40px] dark:text-white">
          Spieler-Dashboard
        </h1>
        <SeasonMessagePanel
          title="Kein Einstieg mehr möglich"
          body="Die Saison hat keinen Spieltag mehr, an dem du einsteigen kannst. Sprich mit dem Staff."
        />
      </div>
    </div>
  );
}
