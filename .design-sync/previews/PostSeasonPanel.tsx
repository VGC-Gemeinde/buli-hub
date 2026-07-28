import { PostSeasonPanel } from "buli-hub";
import type { DivisionWithGroupSizes } from "@/features/seeding/queries";

/* „Auf- & Abstieg" — step 3 of the Divisions-Einteilung, and the densest view in
 * the system. Per-division promotion/demotion rules as a ladder of division
 * cards with a balance seam between neighbours: what tier t demotes must equal
 * what tier t+1 promotes (`validatePostSeason`), and everything staff types is
 * mirrored visually before it is saved.
 *
 * Reading order inside a card (design/AUF-ABSTIEG.md §2): Maßgebliche Tabelle
 * toggle → Zonen-Vorschau strip → steppers laid out in table order so each
 * control maps onto the strip. The four zone tokens are the whole point:
 * `zone-champion` (Meister-Playoff), `zone-promote` (direkter Aufstieg),
 * `zone-playoff` (both playoff bands — one amber, disambiguated by position),
 * `zone-demote` (direkter Abstieg). Over-capacity places get the red/amber
 * diagonal stripe: the capacity error made visible.
 *
 * The panel is `flex-1` inside a scroll frame, so it needs a parent with a
 * definite height — without one, `min-h-0 flex-1` collapses the body to zero.
 * cfg.overrides gives it cardMode:"column" + a 1120x900 viewport.
 * Division configs ported verbatim from the dev/ui gallery („Einteilung: Auf- &
 * Abstieg (Ansicht)"). */

/* A balanced three-tier config: Division 1 sends its top two to the
 * Meister-Playoff and demotes 1 per group (2 total), Division 2 decides over the
 * Gesamttabelle (16 places, per-division counts) and promotes 2, Division 3
 * promotes 1 per group (2 total). Every seam adds up. */
const BALANCED: DivisionWithGroupSizes[] = [
  {
    id: "d1",
    tier: 1,
    relevantTable: "sub_division",
    guaranteedPromotions: 0,
    guaranteedDemotions: 1,
    promotionPlayoffSlots: 0,
    demotionPlayoffSlots: 1,
    championshipPlayoffSlots: 2,
    groupSizes: [8, 8],
  },
  {
    id: "d2",
    tier: 2,
    relevantTable: "division",
    guaranteedPromotions: 2,
    guaranteedDemotions: 2,
    promotionPlayoffSlots: 2,
    demotionPlayoffSlots: 2,
    championshipPlayoffSlots: 0,
    groupSizes: [8, 8],
  },
  {
    id: "d3",
    tier: 3,
    relevantTable: "sub_division",
    guaranteedPromotions: 1,
    guaranteedDemotions: 0,
    promotionPlayoffSlots: 1,
    demotionPlayoffSlots: 0,
    championshipPlayoffSlots: 0,
    groupSizes: [8, 8],
  },
];

/* Both error states in one ladder — groups of four with more movement than they
 * have places:
 *
 * - Division 1 claims 5 of 4 places (2 Meister-Playoff + 1 Abstiegs-Playoff +
 *   2 direkte Abstiege), and place 2 is claimed from the top AND from the
 *   bottom → the red/amber diagonal overbooked stripe plus „Überbelegt um 1".
 * - It demotes 4 (2 je Gruppe × 2) where Division 2 only promotes 2 → the seam
 *   flips to „✕ Nicht gedeckt".
 *
 * Deliberately not the gallery's `POST_SEASON_OVERBOOKED` numbers: those have no
 * top-side band at all (0 Aufstiege, 0 Aufstiegs-Playoff), and `previewZones`
 * only stripes a place that a promotion *and* a demotion band both claim — so
 * that fixture triggers the capacity issue without ever showing the stripe it
 * was written for. See the learnings file. */
const UEBERBELEGT: DivisionWithGroupSizes[] = [
  {
    id: "o1",
    tier: 1,
    relevantTable: "sub_division",
    guaranteedPromotions: 0,
    guaranteedDemotions: 2,
    promotionPlayoffSlots: 0,
    demotionPlayoffSlots: 1,
    championshipPlayoffSlots: 2,
    groupSizes: [4, 4],
  },
  {
    id: "o2",
    tier: 2,
    relevantTable: "sub_division",
    guaranteedPromotions: 1,
    guaranteedDemotions: 0,
    promotionPlayoffSlots: 1,
    demotionPlayoffSlots: 0,
    championshipPlayoffSlots: 0,
    groupSizes: [4, 4],
  },
];

/* Step 3 opened before step 2 is done: the divisions exist but have no groups
 * yet, so there is no capacity to lay zones into. */
const OHNE_GRUPPEN: DivisionWithGroupSizes[] = BALANCED.slice(0, 2).map(
  (division) => ({
    ...division,
    relevantTable: "sub_division" as const,
    guaranteedPromotions: 0,
    guaranteedDemotions: 0,
    promotionPlayoffSlots: 0,
    demotionPlayoffSlots: 0,
    championshipPlayoffSlots: 0,
    groupSizes: [],
  }),
);

const save = async () => ({ ok: true as const, issues: [] });

export function GueltigeRegeln() {
  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-lg border">
      <PostSeasonPanel
        divisions={BALANCED}
        readOnly={false}
        finalized={false}
        configured
        replayTiers="2"
        replayError={null}
        onReplayChange={() => {}}
        onSave={save}
      />
    </div>
  );
}

export function Ueberbelegt() {
  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-lg border">
      <PostSeasonPanel
        divisions={UEBERBELEGT}
        readOnly={false}
        finalized={false}
        configured
        replayTiers="1"
        replayError={null}
        onReplayChange={() => {}}
        onSave={save}
      />
    </div>
  );
}

export function OhneGruppen() {
  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-lg border">
      <PostSeasonPanel
        divisions={OHNE_GRUPPEN}
        readOnly={false}
        finalized={false}
        configured={false}
        replayTiers=""
        replayError={null}
        onReplayChange={() => {}}
        onSave={save}
        onBackToSheet={() => {}}
      />
    </div>
  );
}

/* Finalized: the action strip disappears entirely — there is nothing left to
 * save — and every control is read-only. */
export function Finalisiert() {
  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-lg border">
      <PostSeasonPanel
        divisions={BALANCED}
        readOnly
        finalized
        configured
        replayTiers="2"
        replayError={null}
        onReplayChange={() => {}}
        onSave={save}
      />
    </div>
  );
}
