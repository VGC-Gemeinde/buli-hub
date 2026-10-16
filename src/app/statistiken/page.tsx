import { redirect } from "next/navigation";

// The stats open on the Pokémon ranking (specs/001-pokemon-usage-stats,
// contracts/routes.md); the query string travels along.
export default async function StatistikenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) {
      params.append(key, item);
    }
  }
  const query = params.toString();
  redirect(query ? `/statistiken/pokemon?${query}` : "/statistiken/pokemon");
}
