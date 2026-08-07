import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Prose primitives for the Regelwerk document.
//
// The bullet lists carry a trap worth stating once, here, rather than
// rediscovering it per list: Tailwind's preflight sets `list-style: none` on
// every `ul`, and a `ul` that is also `display: flex` turns its `li`s into flex
// items, which drop their markers entirely. So the list style is set inline and
// the list is never a flex container — items are spaced with a margin instead.

export function Paragraph({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[14.5px] text-muted-foreground leading-[1.65]",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Bullets({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "pl-5 text-[14.5px] text-muted-foreground leading-[1.65]",
        className,
      )}
      style={{ listStyle: "disc outside" }}
    >
      {children}
    </ul>
  );
}

/** Second-level bullets, hollow so the nesting reads without indentation alone. */
export function SubBullets({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-1.5 pl-5" style={{ listStyle: "circle outside" }}>
      {children}
    </ul>
  );
}

export function Bullet({ children }: { children: ReactNode }) {
  return <li className="mb-1.5">{children}</li>;
}

/**
 * The scan layer: dates, thresholds, "freie Teamwahl", division numbers.
 * Nothing else in the prose is emphasised, so this stays meaningful.
 */
export function Key({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

/** The Orga's own asides — the "Es ist okay, wenig Zeit zu haben" voice. */
export function Aside({ children }: { children: ReactNode }) {
  return <em className="italic">{children}</em>;
}
