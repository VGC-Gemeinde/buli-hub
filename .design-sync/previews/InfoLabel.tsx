import { InfoLabel } from "buli-hub";
import { useEffect, useRef } from "react";

/* A short label whose longer definition sits behind it (DESIGN.md §8.14):
 * CSS only, the box shows on hover, on keyboard focus and on a tap. The open
 * cells focus the label on mount to show the navy box. Ported from the
 * dev/ui gallery's "Statistiken" specimen. */

const LABEL_ROW =
  "flex gap-8 font-semibold text-[11.5px] text-muted-foreground uppercase tracking-[0.12em]";

function useFocusInside() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("button")?.focus();
  }, []);
  return ref;
}

export function Kopfzeile() {
  return (
    <div className={LABEL_ROW}>
      <InfoLabel label="Nutzung">
        Anteil der Teams, die dieses Pokémon mitgebracht haben.
      </InfoLabel>
      <InfoLabel label="Siegquote" align="right">
        Anteil der gewonnenen Matches der Teams, die es mitgebracht haben.
      </InfoLabel>
      <InfoLabel label="Matches">
        Gewertete Matches, auf denen Nutzung und Siegquote beruhen.
      </InfoLabel>
    </div>
  );
}

export function Definition() {
  const ref = useFocusInside();
  return (
    <div ref={ref} className={`h-36 items-start ${LABEL_ROW}`}>
      <InfoLabel label="Nutzung">
        Anteil der Teams, die dieses Pokémon mitgebracht haben. Gezählt werden
        nur gewertete Matches.
      </InfoLabel>
    </div>
  );
}

export function DefinitionRechts() {
  const ref = useFocusInside();
  return (
    <div ref={ref} className={`h-36 items-start justify-end ${LABEL_ROW}`}>
      <InfoLabel label="Siegquote" align="right">
        Anteil der gewonnenen Matches der Teams, die es mitgebracht haben.
      </InfoLabel>
    </div>
  );
}

export function Satzteil() {
  return (
    <p className="max-w-md text-muted-foreground text-sm leading-relaxed">
      Basis: 412{" "}
      <InfoLabel label="gewertete Matches">
        Freilose, Doppelniederlagen und Drops zählen nicht.
      </InfoLabel>{" "}
      aus 9 Spieltagen der regulären Saison.
    </p>
  );
}
