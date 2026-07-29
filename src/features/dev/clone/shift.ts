// Date shifting for cloned production data.
//
// A production dump is frozen at the moment it was taken. Offsetting every
// timestamp by one interval moves "today" to wherever the test needs it — the
// day before a deadline, mid-matchday, post-season — which is what turns a
// static snapshot into a test fixture.
//
// The interval must be the *same* for every column, or the data stops being
// internally consistent (a match confirmed before it was reported). The column
// list is read from information_schema at run time rather than maintained by
// hand, so a table added later shifts without anyone remembering to add it.

export type TimestampColumn = {
  table: string;
  column: string;
  /** `date` columns need a cast back; `date + interval` yields a timestamp. */
  kind: "date" | "timestamp";
};

const UNITS = [
  "minute",
  "minutes",
  "hour",
  "hours",
  "day",
  "days",
  "week",
  "weeks",
  "month",
  "months",
  "year",
  "years",
] as const;

const TERM = new RegExp(`^(-?\\d+) (${UNITS.join("|")})$`);

/**
 * Validates a shift interval and returns it in canonical form. Accepts one or
 * more `<integer> <unit>` terms: `30 days`, `-2 weeks`, `-45 days 6 hours`.
 *
 * This is also the injection guard — the result is interpolated into SQL, so
 * anything not matching the grammar must throw rather than be escaped.
 */
export function parseShiftInterval(raw: string): string {
  const terms = raw.trim().split(/\s+/);
  if (terms.length === 0 || terms.length % 2 !== 0) {
    throw new Error(
      `Invalid shift interval: ${JSON.stringify(raw)} — expected e.g. "30 days" or "-2 weeks 6 hours"`,
    );
  }

  const canonical: string[] = [];
  for (let i = 0; i < terms.length; i += 2) {
    const term = `${terms[i]} ${terms[i + 1]}`;
    if (!TERM.test(term)) {
      throw new Error(
        `Invalid shift interval term: ${JSON.stringify(term)} — expected "<integer> <unit>", unit one of ${UNITS.join(", ")}`,
      );
    }
    canonical.push(term);
  }
  return canonical.join(" ");
}

// Identifiers come from information_schema, so they are already real column
// names — but they are interpolated into SQL, so reject anything that could
// break out of the quoting rather than trusting the source.
function quoteIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(name)) {
    throw new Error(`Refusing to quote unexpected identifier: ${name}`);
  }
  return `"${name}"`;
}

/**
 * One UPDATE per table, shifting all of its timestamp columns at once — a
 * single pass per table rather than one per column.
 *
 * No WHERE clause is needed: `null + interval` is null, so null columns are
 * left as they are.
 */
export function buildShiftSql(
  columns: readonly TimestampColumn[],
  interval: string,
): string[] {
  const canonical = parseShiftInterval(interval);

  const byTable = new Map<string, TimestampColumn[]>();
  for (const column of columns) {
    const existing = byTable.get(column.table);
    if (existing) {
      existing.push(column);
    } else {
      byTable.set(column.table, [column]);
    }
  }

  return [...byTable.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([table, cols]) => {
      const assignments = [...cols]
        .sort((a, b) => a.column.localeCompare(b.column))
        .map(({ column, kind }) => {
          const id = quoteIdent(column);
          const shifted = `${id} + interval '${canonical}'`;
          return `${id} = ${kind === "date" ? `(${shifted})::date` : shifted}`;
        })
        .join(", ");
      return `update "public".${quoteIdent(table)} set ${assignments};`;
    });
}
