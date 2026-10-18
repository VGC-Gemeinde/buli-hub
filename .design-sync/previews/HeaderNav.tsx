import { HeaderNav } from "buli-hub";
import type { ReactNode } from "react";

/* The main bar's navigation (design/NAVIGATION.md §3.2): Liga (only while a
 * season runs), Spieler-Dashboard, Staff-Bereich (staff only). The page's
 * section is a bg-muted tab with rounded top corners and the orange tick; in
 * the app it runs straight into the section row of the same colour, which the
 * strip under each bar stands in for here. */

function Bar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="h-13 border-b bg-background px-4">{children}</div>
    </div>
  );
}

function Tabbed({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="h-13 bg-background px-4">{children}</div>
      <div className="h-3 border-b bg-muted" />
    </div>
  );
}

export function AktivAlsStaff() {
  return (
    <Tabbed>
      <HeaderNav isStaff seasonRunning section="staff" />
    </Tabbed>
  );
}

export function AktivLiga() {
  return (
    <Tabbed>
      <HeaderNav isStaff={false} seasonRunning section="liga" />
    </Tabbed>
  );
}

export function AktivSpieler() {
  return (
    <Tabbed>
      <HeaderNav isStaff seasonRunning section="spieler" />
    </Tabbed>
  );
}

export function OhneSaison() {
  return (
    <Tabbed>
      <HeaderNav isStaff={false} seasonRunning={false} section="spieler" />
    </Tabbed>
  );
}

export function OhneBereich() {
  return (
    <Bar>
      <HeaderNav isStaff seasonRunning />
    </Bar>
  );
}
