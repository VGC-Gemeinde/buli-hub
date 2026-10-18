import { BackLink, NextAppRouter } from "buli-hub";

/* The back link of a detail page (design/NAVIGATION.md §3.5): "← Zurück"
 * above the title of a match, a player profile or a teamsheet. These pages
 * are no row entry, so they carry the way back themselves. */

export function AufDerProfilseite() {
  return (
    <NextAppRouter pathname="/spieler/blaubeerkuchen">
      <div className="flex max-w-xl flex-col">
        <BackLink fallbackHref="/" />
        <h1 className="text-4xl">Blaubeerkuchen</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Division 2b · Platz 3 · 4 Siege, 2 Niederlagen
        </p>
      </div>
    </NextAppRouter>
  );
}

export function AufDerMatchseite() {
  return (
    <NextAppRouter pathname="/matches/spieltag-4">
      <div className="flex max-w-xl flex-col">
        <BackLink fallbackHref="/spieler" />
        <span className="font-semibold text-[11.5px] text-muted-foreground uppercase tracking-[0.12em]">
          Spieltag 4 · Division 1a
        </span>
        <h1 className="mt-1 text-3xl">Testerino gegen annegret</h1>
      </div>
    </NextAppRouter>
  );
}

export function NebenEinerUeberschrift() {
  return (
    <NextAppRouter pathname="/statistiken/pokemon/incineroar">
      <div className="flex max-w-xl items-baseline gap-4">
        <BackLink fallbackHref="/statistiken/pokemon" className="mb-0" />
        <h2 className="text-2xl">Incineroar</h2>
      </div>
    </NextAppRouter>
  );
}
