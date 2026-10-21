import type { Account } from "./accounts";

// The checks that decide whether the switch may go on (spec FR-019,
// contracts/switch-procedure.md "Verify"). Pure: the script reads both sides,
// this compares them. Any failed row stops the switch.

export type CheckRow = { check: string; ok: boolean; detail: string };

/** Row counts per table; the target may have only the tables it adds. */
export function compareCounts(
  source: Record<string, number>,
  target: Record<string, number>,
  targetOnly: readonly string[] = ["users", "sessions"],
): CheckRow[] {
  const tables = [
    ...new Set([...Object.keys(source), ...Object.keys(target)]),
  ].filter((table) => !targetOnly.includes(table));
  return tables.sort().map((table) => {
    const from = source[table];
    const to = target[table];
    return {
      check: `rows ${table}`,
      ok: from !== undefined && from === to,
      detail: `${from ?? "missing"} → ${to ?? "missing"}`,
    };
  });
}

/** Every source account with the same id and Discord id, and no other. */
export function compareAccounts(
  expected: Account[],
  actual: { id: string; discordId: string }[],
): CheckRow[] {
  const byId = new Map(actual.map((row) => [row.id, row.discordId]));
  const missing = expected.filter((row) => !byId.has(row.id));
  const changed = expected.filter(
    (row) => byId.has(row.id) && byId.get(row.id) !== row.discordId,
  );
  const expectedIds = new Set(expected.map((row) => row.id));
  const extra = actual.filter((row) => !expectedIds.has(row.id));
  return [
    {
      check: "accounts present",
      ok: missing.length === 0,
      detail: missing.length
        ? `missing: ${missing.map((row) => row.id).join(", ")}`
        : `${expected.length} of ${expected.length}`,
    },
    {
      check: "Discord ids unchanged",
      ok: changed.length === 0,
      detail: changed.length
        ? `changed: ${changed.map((row) => row.id).join(", ")}`
        : "all equal",
    },
    {
      check: "no extra accounts",
      ok: extra.length === 0,
      detail: extra.length
        ? `extra: ${extra.map((row) => row.id).join(", ")}`
        : "none",
    },
  ];
}

/** Every photo a profile points at exists in the target with the source's size. */
export function comparePhotos(
  referenced: string[],
  sourceSizes: Map<string, number>,
  targetSizes: Map<string, number>,
): CheckRow[] {
  const problems = referenced.filter(
    (path) =>
      !targetSizes.has(path) || targetSizes.get(path) !== sourceSizes.get(path),
  );
  return [
    {
      check: "stream photos",
      ok: problems.length === 0,
      detail: problems.length
        ? `missing or different: ${problems.join(", ")}`
        : `${referenced.length} of ${referenced.length}`,
    },
  ];
}

export function allOk(rows: CheckRow[]): boolean {
  return rows.every((row) => row.ok);
}
