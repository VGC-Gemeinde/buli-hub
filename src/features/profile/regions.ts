// Selectable origins, shown grouped in the UI: the 16 German Bundesländer
// and the German-speaking neighbor countries of the VGC Gemeinde community.
// Anything else goes through the free-text „Andere" option and is stored
// as-is.
export const GERMAN_STATES = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
] as const;

export const NEIGHBOR_COUNTRIES = [
  "Österreich",
  "Schweiz",
  "Luxemburg",
] as const;

export const REGIONS = [...GERMAN_STATES, ...NEIGHBOR_COUNTRIES] as const;

export type Region = (typeof REGIONS)[number];

export function isRegion(value: string): value is Region {
  return (REGIONS as readonly string[]).includes(value);
}
