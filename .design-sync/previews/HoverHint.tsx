import { HoverHint } from "buli-hub";
import { useEffect, useRef } from "react";

/* The definition behind a control that does something on click (DESIGN.md
 * §8.14): a sortable column head or a filter chip on the Pokémon-Statistiken.
 * The child is ONE element that takes a ref, as in the app (a Link there, a
 * button here). It opens on hover and keyboard focus, so the open cells focus
 * their trigger on mount to show the navy box. */

const STONES =
  "Rechnet Mega-Steine heraus, die ihr eigenes Mega trägt. Ein Stein auf einem anderen Pokémon bleibt drin.";
const USAGE =
  "Anteil der Teams, die dieses Pokémon mitgebracht haben. Gezählt werden nur gewertete Matches: Freilose, Doppelniederlagen und Drops zählen nicht.";
const WIN =
  "Anteil der gewonnenen Matches der Teams, die es mitgebracht haben.";

const CHIP =
  "inline-flex h-8 items-center whitespace-nowrap rounded-full border px-3 text-[12.5px] transition-colors bg-background font-medium text-muted-foreground hover:text-foreground";

const HEAD =
  "inline-flex items-center gap-1 rounded-[3px] outline-offset-2 transition-colors hover:text-brand-blue font-semibold text-[11.5px] text-muted-foreground uppercase tracking-[0.12em]";

function useFocusOnMount() {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}

export function FilterChipOffen() {
  const ref = useFocusOnMount();
  return (
    <div className="flex h-40 items-start justify-end">
      <HoverHint hint={STONES} align="end">
        <button ref={ref} type="button" aria-pressed={false} className={CHIP}>
          <span className="cursor-help underline decoration-dotted underline-offset-[3px]">
            Ohne Mega-Steine
          </span>
        </button>
      </HoverHint>
    </div>
  );
}

export function SpaltenkopfOffen() {
  const ref = useFocusOnMount();
  return (
    <div className="flex h-40 items-start gap-8">
      <span className={HEAD}>Pokémon</span>
      <HoverHint hint={USAGE}>
        <button ref={ref} type="button" className={HEAD}>
          <span className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-[3px]">
            Nutzung
          </span>
          <span
            aria-hidden
            className="inline-block w-2.5 text-[12px] text-brand-orange"
          >
            ↓
          </span>
        </button>
      </HoverHint>
      <span className={HEAD}>Siegquote</span>
    </div>
  );
}

export function Geschlossen() {
  return (
    <div className="flex gap-8">
      <HoverHint hint={USAGE}>
        <button type="button" className={HEAD}>
          <span className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-[3px]">
            Nutzung
          </span>
        </button>
      </HoverHint>
      <HoverHint hint={WIN} align="end">
        <button type="button" className={HEAD}>
          <span className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-[3px]">
            Siegquote
          </span>
        </button>
      </HoverHint>
    </div>
  );
}
