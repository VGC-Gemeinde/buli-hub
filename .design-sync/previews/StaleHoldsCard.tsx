import { StaleHoldsCard } from "buli-hub";

/* The staff dashboard's loud reminder (docs/plans/recording-holds.md):
 * recording holds whose Spieltag is over. Always the destructive surface: a
 * forgotten release is a result the community never gets, so it never
 * softens to a nudge.
 *
 * Composed at the staff page's column width (`max-w-[1040px]`).
 */

/** On `/staff`: two held matches, both reported, with the button to the
 *  Aufnahmen page. */
export function Dashboard() {
  return (
    <div className="max-w-[1040px]">
      <StaleHoldsCard summary={{ count: 2, allReported: true }} />
    </div>
  );
}

/** Singular title for one held match. */
export function Einzahl() {
  return (
    <div className="max-w-[1040px]">
      <StaleHoldsCard summary={{ count: 1, allReported: true }} />
    </div>
  );
}

/** Some of the held matches are not reported yet: the second line explains
 *  that they stay held after the report until released. */
export function TeilsOffen() {
  return (
    <div className="max-w-[1040px]">
      <StaleHoldsCard summary={{ count: 3, allReported: false }} />
    </div>
  );
}

/** On `/staff/aufnahmen` itself the list is right below: no button. */
export function Workspace() {
  return (
    <div className="max-w-[1040px]">
      <StaleHoldsCard
        summary={{ count: 2, allReported: true }}
        linkToPage={false}
      />
    </div>
  );
}
