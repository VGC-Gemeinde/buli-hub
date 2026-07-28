#!/usr/bin/env node
/*
 * Verify that every Tailwind class used by the authored previews actually
 * exists in the compiled stylesheet.
 *
 * Why this exists: Tailwind compiles only the utilities it finds when scanning
 * source. A class a preview invents is never compiled, and the browser then
 * ignores it **silently** — the element just renders unstyled, which reads as a
 * component bug rather than a missing class. `preview-rebuild.mjs` does not
 * re-run the CSS build, so this is easy to hit and hard to see.
 *
 * The safelist in ds-entry.css covers the general utility surface, but
 * ARBITRARY VALUES (`w-[620px]`) can never be safelisted — they exist only if
 * the app itself uses them. Those are what this mostly catches.
 *
 *   node .design-sync/check-classes.mjs
 *
 * Note on matching: CSS selectors escape everything outside [A-Za-z0-9_-], so
 * `gap-1.5` is stored as `.gap-1\.5` and `w-[80px]` as `.w-\[80px\]`. Grepping
 * the raw class name gives false "missing" results — escape first (this was a
 * real false-negative during the first authoring wave).
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const CSS = readFileSync(resolve(ROOT, "ds-bundle/_ds_bundle.css"), "utf8");
const PREVIEWS = resolve(ROOT, ".design-sync/previews");

/** CSS.escape for the subset that appears in Tailwind class names. */
const escapeSelector = (cls) =>
  cls.replace(/[^A-Za-z0-9_-]/g, (ch) => `\\${ch}`);

/* Variants are separate selectors (`.dark\:bg-card`, `.sm\:flex`) and
 * `group-*`/`peer-*`/`data-*` compile to shapes we can't check naively — check
 * the base utility, which is what actually goes missing. */
function baseUtility(cls) {
  const parts = cls.split(":");
  return parts[parts.length - 1];
}

const present = (cls) => CSS.includes(`.${escapeSelector(cls)}`);

const missing = new Map();
let checked = 0;

for (const file of readdirSync(PREVIEWS).filter((f) => /\.tsx?$/.test(f))) {
  const src = readFileSync(resolve(PREVIEWS, file), "utf8");
  const classes = new Set();
  // className="…" and className={`…`} — template holes are skipped wholesale.
  for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    // Drop `${…}` interpolations wholesale — their contents are JS, not classes.
    const literal = (m[1] ?? m[2] ?? "").replace(/\$\{[\s\S]*?\}/g, " ");
    for (const tok of literal.split(/\s+/)) {
      if (!tok) continue;
      /* A className can hold a JS expression (`${cond ? "a" : "b"}`); splitting
       * on whitespace shreds it into fragments like `?`, `===`, `"a"`. Only
       * accept tokens shaped like a real utility. */
      if (!/^[a-z][a-z0-9]*(?:[-/:.[\]%!]|[a-z0-9])*$/i.test(tok)) continue;
      if (tok.includes("${")) continue;
      classes.add(tok);
    }
  }
  for (const cls of classes) {
    const base = baseUtility(cls);
    // Skip things that aren't utilities we can resolve statically.
    if (/^(group|peer)(\/|$)/.test(base)) continue;
    checked++;
    if (!present(base) && !present(cls)) {
      if (!missing.has(file)) missing.set(file, new Set());
      missing.get(file).add(cls);
    }
  }
}

if (missing.size === 0) {
  console.log(`✓ all ${checked} preview classes resolve in _ds_bundle.css`);
  process.exit(0);
}
console.log(
  `✗ ${[...missing.values()].reduce((n, s) => n + s.size, 0)} of ${checked} preview classes are MISSING from _ds_bundle.css:\n`,
);
for (const [file, set] of [...missing].sort()) {
  console.log(`  ${file}`);
  for (const c of [...set].sort()) console.log(`      ${c}`);
}
console.log(
  "\nArbitrary values (w-[620px]) cannot be safelisted — swap for the named scale.",
);
console.log(
  "Named utilities missing here should be added to .design-sync/ds-entry.css.",
);
process.exit(1);
