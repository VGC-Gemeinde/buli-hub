import { describe, expect, it } from "vitest";
import { generateRoundRobin, roundCount } from "./round-robin";

// Players are just numbers 0..n-1 here.
function players(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

describe("roundCount", () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 1],
    [3, 3],
    [4, 3],
    [5, 5],
    [6, 5],
    [7, 7],
    [8, 7],
  ])("n=%i → %i rounds", (n, expected) => {
    expect(roundCount(n)).toBe(expected);
  });
});

describe("generateRoundRobin", () => {
  it("is empty for 0 or 1 players", () => {
    expect(generateRoundRobin(players(0))).toEqual([]);
    expect(generateRoundRobin(players(1))).toEqual([]);
  });

  for (const n of [2, 3, 4, 5, 7, 8]) {
    describe(`${n} players`, () => {
      const schedule = generateRoundRobin(players(n));

      it("produces the right number of rounds", () => {
        expect(schedule.length).toBe(roundCount(n));
      });

      it("has every player exactly once per round (as player or bye)", () => {
        for (const round of schedule) {
          const seen = new Set<number>();
          for (const { a, b } of round) {
            expect(seen.has(a)).toBe(false);
            seen.add(a);
            if (b !== null) {
              expect(seen.has(b)).toBe(false);
              seen.add(b);
            }
          }
          expect(seen.size).toBe(n);
        }
      });

      it("pairs every distinct pair exactly once", () => {
        const counts = new Map<string, number>();
        for (const round of schedule) {
          for (const { a, b } of round) {
            if (b === null) {
              continue;
            }
            const key = a < b ? `${a}-${b}` : `${b}-${a}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
        }
        // Exactly C(n, 2) distinct pairs, each once.
        expect(counts.size).toBe((n * (n - 1)) / 2);
        for (const count of counts.values()) {
          expect(count).toBe(1);
        }
      });

      it("distributes byes correctly (odd: one each, even: none)", () => {
        const byes = new Map<number, number>();
        for (const round of schedule) {
          for (const { a, b } of round) {
            if (b === null) {
              byes.set(a, (byes.get(a) ?? 0) + 1);
            }
          }
        }
        if (n % 2 === 0) {
          expect(byes.size).toBe(0);
        } else {
          expect(byes.size).toBe(n);
          for (const count of byes.values()) {
            expect(count).toBe(1);
          }
        }
      });
    });
  }

  it("is deterministic for the same input", () => {
    expect(generateRoundRobin(players(6))).toEqual(
      generateRoundRobin(players(6)),
    );
  });
});
