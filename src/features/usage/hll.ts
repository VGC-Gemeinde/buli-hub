/**
 * HyperLogLog — approximate distinct counts that store nothing about anyone.
 *
 * Counting unique visitors normally means keeping a set of who was here, which
 * is exactly the thing this app should not have. A HyperLogLog keeps 4096
 * one-byte registers instead: each visitor's hash bumps one register to the
 * longest run of leading zeros seen at that index, and the cardinality is read
 * back from the distribution. The hash itself is never stored, so a sketch
 * cannot be asked "was this person here?" — there is no membership to query,
 * only an estimate of how many there were.
 *
 * Registers also merge by taking the element-wise maximum, which is
 * order-independent and idempotent. That is what lets the log backfill fold
 * its own sketch into a period that was already counted live without
 * coordination or double-counting.
 *
 * p=12 gives 4096 registers (4KB per period) and ~1.6% relative error, far
 * finer than a "feel for how busy it is" needs.
 *
 * Ported unchanged from the Draft Builder (src/lib/server/hll.ts).
 */

const PRECISION = 12;
const REGISTERS = 1 << PRECISION; // 4096
/** Bits of the hash left for the leading-zero run once the index is taken. */
const RANK_BITS = 64 - PRECISION;

/** Bias constant for the harmonic-mean estimator at this register count. */
const ALPHA = 0.7213 / (1 + 1.079 / REGISTERS);

export class HyperLogLog {
  private readonly registers: Uint8Array;

  // No parameter property: scripts load this through Node's type stripping,
  // which rejects TypeScript-only runtime syntax.
  private constructor(registers: Uint8Array) {
    this.registers = registers;
  }

  static empty(): HyperLogLog {
    return new HyperLogLog(new Uint8Array(REGISTERS));
  }

  /** Rebuild from stored bytes; anything the wrong size starts over empty. */
  static from(bytes: Uint8Array | null | undefined): HyperLogLog {
    if (!bytes || bytes.length !== REGISTERS) return HyperLogLog.empty();
    return new HyperLogLog(Uint8Array.from(bytes));
  }

  toBytes(): Buffer {
    return Buffer.from(this.registers);
  }

  isEmpty(): boolean {
    return this.registers.every((r) => r === 0);
  }

  /**
   * Fold in one observation, given at least 8 bytes of hash.
   *
   * The first 12 bits pick the register; the following 52 decide its candidate
   * value, which is the position of the first 1-bit (so a rarer run of leading
   * zeros implies more distinct inputs seen).
   */
  add(digest: Uint8Array): void {
    const index =
      (((digest[0] ?? 0) << 4) | ((digest[1] ?? 0) >> 4)) & (REGISTERS - 1);
    let rank = 1;
    // Walk the remaining 52 bits, starting with the low nibble of byte 1.
    let bit = PRECISION;
    while (bit < 64) {
      const byte = digest[bit >> 3] ?? 0;
      const isSet = (byte >> (7 - (bit & 7))) & 1;
      if (isSet) break;
      rank++;
      bit++;
    }
    if (rank > RANK_BITS + 1) rank = RANK_BITS + 1;
    if (rank > (this.registers[index] ?? 0)) this.registers[index] = rank;
  }

  /** Element-wise max: the merge of two sketches is the sketch of the union. */
  merge(other: HyperLogLog): void {
    for (let i = 0; i < REGISTERS; i++) {
      const theirs = other.registers[i] ?? 0;
      if (theirs > (this.registers[i] ?? 0)) this.registers[i] = theirs;
    }
  }

  /**
   * Estimated distinct count.
   *
   * The harmonic-mean estimator is biased for small sets — precisely the range
   * a league hub lives in — so while any register is still empty we use linear
   * counting instead, which is near-exact down to a handful of visitors.
   */
  estimate(): number {
    let sum = 0;
    let zeros = 0;
    for (let i = 0; i < REGISTERS; i++) {
      const value = this.registers[i] ?? 0;
      sum += 2 ** -value;
      if (value === 0) zeros++;
    }
    const raw = (ALPHA * REGISTERS * REGISTERS) / sum;
    if (raw <= 2.5 * REGISTERS && zeros > 0) {
      return Math.round(REGISTERS * Math.log(REGISTERS / zeros));
    }
    return Math.round(raw);
  }
}

export const HLL_REGISTER_COUNT = REGISTERS;
