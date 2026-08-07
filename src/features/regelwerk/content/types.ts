import type { ReactNode } from "react";

// The shape of one season's ruleset. Structure (chapters, anchors, the "Auf
// einen Blick" facts) is data — the chapter list, the scroll-spy and the
// anchor-integrity test all read it. The prose itself is a ReactNode, because
// the rules are dense with inline emphasis, links and the four diagram
// pull-outs, none of which survive being flattened into strings.

export type Chapter = {
  /** Anchor id, also the chapter list's href target. Unique per document. */
  id: string;
  /** 1-based; rendered as "Kapitel 3" and in the chapter list. */
  number: number;
  title: string;
  sections: Section[];
};

export type Section = {
  title: string;
  body: ReactNode;
};

/** One "Auf einen Blick" tile. */
export type Fact = {
  label: string;
  value: string;
  /**
   * `date` 20px tabular · `large` 20px proportional · `text` 15px. A date and
   * "Best of 3 · Open Team Sheet" cannot share a type size without one of them
   * wrapping badly; tabular figures are only right for the actual dates.
   */
  kind: "date" | "large" | "text";
};

export type RegelwerkDocument = {
  seasonNumber: number;
  /** Human date the ruleset takes effect, e.g. "07.09.2026". */
  validFrom: string;
  /**
   * Exactly six tiles. The one at `emphasisIndex` gets the orange treatment —
   * it is the date everything else hangs off.
   */
  facts: Fact[];
  emphasisIndex: number;
  chapters: Chapter[];
};
