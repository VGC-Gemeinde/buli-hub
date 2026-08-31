import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { HLL_REGISTER_COUNT, HyperLogLog } from "./hll";

const digest = (input: string) => createHash("sha256").update(input).digest();

function sketchOf(count: number, prefix = "visitor"): HyperLogLog {
  const sketch = HyperLogLog.empty();
  for (let i = 0; i < count; i++) sketch.add(digest(`${prefix}-${i}`));
  return sketch;
}

describe("HyperLogLog", () => {
  it("counts nothing as nothing", () => {
    expect(HyperLogLog.empty().estimate()).toBe(0);
    expect(HyperLogLog.empty().isEmpty()).toBe(true);
  });

  it("is near-exact at the small counts a league hub actually sees", () => {
    for (const n of [1, 5, 10, 50, 100, 250]) {
      const estimate = sketchOf(n).estimate();
      expect(Math.abs(estimate - n)).toBeLessThanOrEqual(Math.max(1, n * 0.03));
    }
  });

  it("stays within a few percent at larger counts", () => {
    for (const n of [1000, 5000, 20000]) {
      const estimate = sketchOf(n).estimate();
      expect(Math.abs(estimate - n) / n).toBeLessThan(0.05);
    }
  });

  it("counts a repeat visitor once, however often they return", () => {
    const sketch = HyperLogLog.empty();
    for (let i = 0; i < 500; i++) sketch.add(digest("the same person"));
    expect(sketch.estimate()).toBe(1);
  });

  it("merges sketches the same as counting in one place", () => {
    const a = sketchOf(300, "a");
    const b = sketchOf(300, "b");
    const together = HyperLogLog.empty();
    for (let i = 0; i < 300; i++) {
      together.add(digest(`a-${i}`));
      together.add(digest(`b-${i}`));
    }
    a.merge(b);
    expect(a.estimate()).toBe(together.estimate());
  });

  it("is idempotent under repeated merges, so a replay cannot inflate", () => {
    const a = sketchOf(200);
    const before = a.estimate();
    const copy = HyperLogLog.from(a.toBytes());
    a.merge(copy);
    a.merge(copy);
    expect(a.estimate()).toBe(before);
  });

  it("round-trips through storage", () => {
    const sketch = sketchOf(77);
    const bytes = sketch.toBytes();
    expect(bytes.length).toBe(HLL_REGISTER_COUNT);
    expect(HyperLogLog.from(bytes).estimate()).toBe(sketch.estimate());
  });

  it("starts fresh rather than throwing on damaged or missing bytes", () => {
    expect(HyperLogLog.from(null).estimate()).toBe(0);
    expect(HyperLogLog.from(new Uint8Array(12)).estimate()).toBe(0);
  });

  it("keeps no trace of who was counted", () => {
    const sketch = sketchOf(1);
    const bytes = sketch.toBytes();
    // One visitor touches exactly one register with a small rank; the hash
    // itself is nowhere in the bytes.
    const touched = [...bytes].filter((value) => value !== 0);
    expect(touched).toHaveLength(1);
    expect(bytes.includes(digest("visitor-0").subarray(0, 4))).toBe(false);
  });
});
