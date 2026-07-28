import { MotwTodoCard } from "buli-hub";

/* The staff dashboard's Match-of-the-Week todo (design/MATCH-OF-THE-WEEK.md
 * §6), sitting between the SeasonStrip and the Saison-Dashboard worklist. Two
 * urgencies, derived by `motwTodo()` — never a blocker, purely a nudge:
 *
 *   warning  next Spieltag has no pick yet → orange family, outline button
 *   urgent   the RUNNING Spieltag has none → destructive family, primary
 *            (orange, white label) button
 *
 * The urgent variant replaces the warning rather than stacking with it, so a
 * dashboard only ever shows one of these at a time.
 *
 * Wrapped at the staff dashboard's column width so the `justify-between`
 * button lands where it does in production.
 */

/** Nudge: Spieltag 3 starts next week and has no pick yet. */
export function Hinweis() {
  return (
    <div className="mx-auto max-w-4xl">
      <MotwTodoCard todo={{ round: 3, urgency: "warning" }} />
    </div>
  );
}

/** Escalated: Spieltag 2 is already running without a Match of the Week —
 *  destructive border/tint, red title, primary button. */
export function Dringend() {
  return (
    <div className="mx-auto max-w-4xl">
      <MotwTodoCard todo={{ round: 2, urgency: "urgent" }} />
    </div>
  );
}
