// Single round-robin scheduling via the circle method.
//
// `generateRoundRobin` returns one entry per round; each round is a list of
// pairings `{ a, b }`, where `b` is null for a bye. Every pair of players meets
// exactly once. An even player count yields `n - 1` rounds with no byes; an odd
// count yields `n` rounds with exactly one bye per round (each player byes
// once). Output is deterministic in the input order.

export type Pairing<T> = { a: T; b: T | null };

// Number of rounds (Spieltage) a group of `n` players needs: `n - 1` when even,
// `n` when odd (the extra round carries the byes), `0` for a group of ≤ 1.
export function roundCount(n: number): number {
  if (n <= 1) {
    return 0;
  }
  return n % 2 === 0 ? n - 1 : n;
}

const BYE = Symbol("bye");

export function generateRoundRobin<T>(players: readonly T[]): Pairing<T>[][] {
  if (players.length <= 1) {
    return [];
  }

  // Odd counts get a bye sentinel so the field is even and everyone is paired
  // each round; whoever draws the sentinel sits out that round.
  const even = players.length % 2 === 0;
  let slots: (T | typeof BYE)[] = even ? [...players] : [...players, BYE];
  const size = slots.length;
  const rounds = size - 1;
  const half = size / 2;

  const result: Pairing<T>[][] = [];
  for (let r = 0; r < rounds; r++) {
    const pairings: Pairing<T>[] = [];
    for (let i = 0; i < half; i++) {
      const x = slots[i];
      const y = slots[size - 1 - i];
      if (x === BYE) {
        pairings.push({ a: y as T, b: null });
      } else if (y === BYE) {
        pairings.push({ a: x as T, b: null });
      } else {
        pairings.push({ a: x as T, b: y as T });
      }
    }
    result.push(pairings);

    // Rotate every slot but the first: the last element moves to position 1,
    // the rest shift down. Fixing slot 0 is what makes the circle method cover
    // each pair exactly once.
    const [fixed, ...rest] = slots;
    const last = rest[rest.length - 1];
    slots = [fixed, last, ...rest.slice(0, rest.length - 1)];
  }
  return result;
}
