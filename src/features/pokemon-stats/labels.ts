import type { Category } from "./filter";
import type { RankingCategory } from "./rankings";

// Plain labels, free of the dex, so client components (the /dev gallery) can
// use them.

export const CATEGORY_LABEL: Record<Category, string> = {
  pokemon: "Pokémon",
  items: "Items",
  faehigkeiten: "Fähigkeiten",
  attacken: "Attacken",
};

export const CATEGORY_KIND: Record<Category, RankingCategory> = {
  pokemon: "pokemon",
  items: "items",
  faehigkeiten: "abilities",
  attacken: "moves",
};

export const DETAIL_KICKER: Record<Exclude<Category, "pokemon">, string> = {
  items: "Item",
  faehigkeiten: "Fähigkeit",
  attacken: "Attacke",
};
