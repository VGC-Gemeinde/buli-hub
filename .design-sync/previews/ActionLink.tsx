import { ActionLink, SectionHeader } from "buli-hub";

/* The standalone action link (DESIGN.md §2.7): semibold brand-blue with a
 * trailing „→" that slides on hover. It renders a Next.js Link when `href` is
 * given and a plain button otherwise (in-place actions such as „Alle Partien
 * anzeigen") — the two modes are styled identically on purpose, so the cells
 * below vary the surrounding context rather than the mode.
 *
 * `disabled` is accepted but has no styling of its own; a disabled ActionLink
 * looks exactly like an enabled one, so it is deliberately not shown here. */

export function Navigationslinks() {
  return (
    <div className="flex flex-col items-start gap-3">
      <ActionLink href="/dashboard">Zum Spieler-Dashboard</ActionLink>
      <ActionLink href="/liga">Alle Ergebnisse ansehen</ActionLink>
      <ActionLink href="/spielplan/2">Spieltag 2 ansehen</ActionLink>
      <ActionLink>Alle 8 Partien anzeigen</ActionLink>
    </div>
  );
}

export function ImKartenfuss() {
  const cards = [
    ["Spieltag 2", "3 von 4 Partien gemeldet", "Ergebnisse"],
    ["Teilnehmerfeld", "16 Spieler in Division 1", "Alle Spieler"],
    ["Dein Profil", "Discord verknüpft seit Juli 2026", "Bearbeiten"],
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(([title, meta, cta]) => (
        <div
          className="flex flex-col gap-2 rounded-xl border px-4 py-4"
          key={title}
        >
          <span className="font-semibold text-[15px]">{title}</span>
          <span className="text-[13px] text-muted-foreground">{meta}</span>
          <ActionLink href="/liga" className="mt-1 text-sm">
            {cta}
          </ActionLink>
        </div>
      ))}
    </div>
  );
}

export function NebenAbschnitt() {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader meta={<ActionLink href="/liga">Gesamttabelle</ActionLink>}>
        Tabelle
      </SectionHeader>
      <div className="flex items-center justify-between rounded-xl border px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-[15px]">Spieltag 2</span>
          <span className="text-[13px] text-muted-foreground">
            05.01.2026 – 11.01.2026 · 3 von 4 Partien gemeldet
          </span>
        </div>
        <ActionLink href="/spielplan/2">Ansehen</ActionLink>
      </div>
    </div>
  );
}
