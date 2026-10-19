import { NextAppRouter, StatsFilters } from "buli-hub";
import type { FilterSelect } from "@/features/pokemon-stats/components/stats-filters";

/* The filter row above every ranking (specs/001-pokemon-usage-stats). Every
 * choice is a URL built on the server, so each cell sits on the page and query
 * it shows. "Filter zurücksetzen" keeps its place while invisible: setting a
 * filter never moves the row. */

const PATH = "/statistiken/pokemon";

function selects({
  tier,
  round,
  min,
  postSeason = false,
}: {
  tier: number | null;
  round: number | null;
  min: number;
  postSeason?: boolean;
}): FilterSelect[] {
  const weeks = postSeason
    ? [
        ...Array.from({ length: 9 }, (_, i) => ({
          round: i + 1,
          name: `Spieltag ${i + 1}`,
        })),
        { round: 10, name: "Woche 1" },
        { round: 11, name: "Woche 2" },
      ]
    : Array.from({ length: 9 }, (_, i) => ({
        round: i + 1,
        name: `Spieltag ${i + 1}`,
      }));
  return [
    {
      id: "stats-division",
      label: "Division",
      value: tier === null ? "" : String(tier),
      set: tier !== null,
      options: [
        { value: "", label: "Alle Divisionen", href: PATH },
        ...[1, 2, 3, 4].map((t) => ({
          value: String(t),
          label: `Division ${t}`,
          href: `${PATH}?division=${t}`,
        })),
      ],
    },
    {
      id: "stats-week",
      label: "Spieltag",
      value: round === null ? "" : String(round),
      set: round !== null,
      options: [
        {
          value: "",
          label: postSeason ? "Alle Wochen" : "Alle Spieltage",
          href: PATH,
        },
        ...weeks.map((week) => ({
          value: String(week.round),
          label: week.name,
          href: `${PATH}?woche=${week.round}`,
        })),
      ],
    },
    {
      id: "stats-min",
      label: "Mindestnutzung",
      value: String(min),
      set: min !== 0,
      options: [
        { value: "0", label: "Jede Nutzung", href: PATH },
        ...[1, 2, 5, 10].map((m) => ({
          value: String(m),
          label: `Nutzung ab ${m} %`,
          href: `${PATH}?min=${m}`,
        })),
      ],
    },
  ];
}

export function AlleTeams() {
  return (
    <NextAppRouter pathname={PATH} search="">
      <StatsFilters
        phase={null}
        selects={selects({ tier: null, round: null, min: 0 })}
        reset={{ href: PATH, visible: false }}
      />
    </NextAppRouter>
  );
}

export function DivisionUndSpieltag() {
  return (
    <NextAppRouter pathname={PATH} search="division=2&woche=6&min=2">
      <StatsFilters
        phase={null}
        selects={selects({ tier: 2, round: 6, min: 2 })}
        reset={{ href: PATH, visible: true }}
      />
    </NextAppRouter>
  );
}

/* Once the Nachsaison has begun, the phase switch leads the row and the week
 * select also lists the post-season weeks. */
export function Nachsaison() {
  return (
    <NextAppRouter pathname={PATH} search="phase=post&division=1">
      <StatsFilters
        phase={[
          { label: "Alle", href: `${PATH}?division=1`, active: false },
          {
            label: "Reguläre Saison",
            href: `${PATH}?phase=regular&division=1`,
            active: false,
          },
          {
            label: "Nachsaison",
            href: `${PATH}?phase=post&division=1`,
            active: true,
          },
        ]}
        selects={selects({ tier: 1, round: null, min: 0, postSeason: true })}
        reset={{ href: PATH, visible: true }}
      />
    </NextAppRouter>
  );
}
