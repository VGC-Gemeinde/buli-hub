import type { Platform } from "@/features/registration/registration";

// The group sizes for `n` players with target `size`: `ceil(n/size)` groups,
// spread as evenly as possible (sizes differ by at most 1), larger groups
// first. 20 with size 8 → [7, 7, 6]. Empty when there are no players.
export function computeGroupSizes(n: number, size: number): number[] {
  if (n <= 0) {
    return [];
  }
  const groupCount = Math.ceil(n / size);
  const base = Math.floor(n / groupCount);
  const remainder = n % groupCount;
  return Array.from({ length: groupCount }, (_, i) =>
    i < remainder ? base + 1 : base,
  );
}

/**
 * Splits players into sub-divisions of (near-)equal size, soft-preferring to
 * keep same-platform players together: players are ordered platform-contiguous
 * (largest platform first) and sliced into the fixed group sizes, so mixing
 * only happens at the unavoidable boundaries. Group sizes (balance) are the
 * hard constraint; platform grouping is the soft one.
 */
export function generateSubDivisions<T extends { platform: Platform }>(
  players: readonly T[],
  size: number,
): T[][] {
  const sizes = computeGroupSizes(players.length, size);
  if (sizes.length === 0) {
    return [];
  }

  const byPlatform = new Map<Platform, T[]>();
  for (const player of players) {
    const bucket = byPlatform.get(player.platform);
    if (bucket) {
      bucket.push(player);
    } else {
      byPlatform.set(player.platform, [player]);
    }
  }

  // Largest platform first (ties broken by name) for deterministic output.
  const ordered = [...byPlatform.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .flatMap(([, bucket]) => bucket);

  const groups: T[][] = [];
  let index = 0;
  for (const groupSize of sizes) {
    groups.push(ordered.slice(index, index + groupSize));
    index += groupSize;
  }
  return groups;
}
