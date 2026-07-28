#!/usr/bin/env node
/*
 * design-sync CSS/font prep for buli-hub.
 *
 * buli-hub is a Next.js app, not a published component package, so two things
 * the design-sync converter expects don't exist here and are produced by this
 * script instead:
 *
 *  1. A COMPILED stylesheet. src/app/globals.css is Tailwind v4 *source*
 *     (`@import "tailwindcss"`), which can't ship as-is. We run the Tailwind
 *     CLI over it so the bundle carries real rules for every class the
 *     components use.
 *
 *  2a. A safelist. Tailwind compiles only what it finds in the scanned source,
 *     so a stylesheet built from buli-hub alone contains exactly the classes
 *     buli-hub uses — and the design agent, building NEW screens, needs
 *     ordinary layout glue the app may never have used. `.design-sync/ds-entry.css`
 *     wraps globals.css (untouched) and declares that surface. NOTE: arbitrary
 *     values (`w-[620px]`) can never be safelisted and fail silently.
 *
 *  2. Self-hosted brand fonts. The app gets Montserrat from `next/font`, which
 *     only exists inside Next's build — in the bundle `--font-sans` would be
 *     the self-referential `var(--font-sans)` and every design would render in
 *     a fallback face. We download Montserrat's woff2 files once, emit
 *     @font-face rules for them, and define the two font variables.
 *
 *  3. A package entry. There is no `main`/`module`/dist to bundle, so we
 *     synthesize one that re-exports every file named in cfg.componentSrcMap.
 *     Deriving it from the map keeps a single source of truth for scope, and
 *     `export *` also puts each file's SUBPARTS (DialogContent, SelectItem, …)
 *     on window.VgcGemeinde even though only the mapped names get cards.
 *
 * Outputs:
 *   .design-sync/fonts/*.woff2       committed, so a re-sync needs no network
 *   .design-sync/fonts.css           committed; wired via cfg.extraFonts
 *   .design-sync/.cache/css/ds.css   generated; wired via cfg.cssEntry
 *   .design-sync/.cache/entry.mjs    generated; wired via cfg.entry
 *
 * Idempotent: already-downloaded fonts are reused. Run from the repo root.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const FONT_DIR = resolve(ROOT, ".design-sync/fonts");
const FONTS_CSS = resolve(ROOT, ".design-sync/fonts.css");
const OUT_CSS = resolve(ROOT, ".design-sync/.cache/css/ds.css");
const CONFIG = resolve(ROOT, ".design-sync/config.json");
const OUT_ENTRY = resolve(ROOT, ".design-sync/.cache/entry.mjs");
const OUT_SHIM = resolve(ROOT, ".design-sync/.cache/process-shim.mjs");
const OUT_DTS = resolve(ROOT, "index.d.ts");
const TW_CLI = resolve(
  ROOT,
  ".ds-sync/node_modules/@tailwindcss/cli/dist/index.mjs",
);

// Weights the app actually loads (layout.tsx): body 400/500/600, headings 700/800.
const WEIGHTS = [400, 500, 600, 700, 800];
// German copy needs latin + latin-ext; the cyrillic/vietnamese subsets are dead weight.
const SUBSETS = new Set(["latin", "latin-ext"]);
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function log(msg) {
  process.stderr.write(`[prepare-css] ${msg}\n`);
}

/* Google's css2 endpoint emits one @font-face per weight+subset, each preceded
 * by a `/* <subset> *​/` comment. Parse those pairs so we can keep only the
 * subsets we want and rewrite each src to a local file. */
function parseGoogleCss(css) {
  const blocks = [];
  const re = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/gi;
  for (const [, subset, block] of css.matchAll(re)) {
    const weight = block.match(/font-weight:\s*(\d+)/)?.[1];
    const url = block.match(/url\(([^)]+)\)/)?.[1];
    const range = block.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
    if (subset && weight && url) blocks.push({ subset, weight, url, range });
  }
  return blocks;
}

async function main() {
  mkdirSync(FONT_DIR, { recursive: true });
  mkdirSync(dirname(OUT_CSS), { recursive: true });

  // --- fonts -------------------------------------------------------------
  const api = `https://fonts.googleapis.com/css2?family=Montserrat:wght@${WEIGHTS.join(";")}&display=swap`;
  const needsAny = WEIGHTS.some((w) =>
    [...SUBSETS].some(
      (s) => !existsSync(resolve(FONT_DIR, `Montserrat-${w}-${s}.woff2`)),
    ),
  );

  let faces = [];
  if (needsAny) {
    log("fetching Montserrat metadata from Google Fonts");
    const res = await fetch(api, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`Google Fonts returned ${res.status}`);
    faces = parseGoogleCss(await res.text()).filter((f) =>
      SUBSETS.has(f.subset),
    );
    if (!faces.length)
      throw new Error(
        "parsed zero @font-face blocks — endpoint format changed?",
      );

    for (const f of faces) {
      const file = resolve(
        FONT_DIR,
        `Montserrat-${f.weight}-${f.subset}.woff2`,
      );
      f.file = file;
      if (existsSync(file)) continue;
      const r = await fetch(f.url, { headers: { "User-Agent": UA } });
      if (!r.ok)
        throw new Error(`font download failed (${r.status}): ${f.url}`);
      writeFileSync(file, Buffer.from(await r.arrayBuffer()));
      log(`downloaded ${f.weight}/${f.subset}`);
    }
  } else {
    log("fonts already present — skipping download");
  }

  /* Rebuild fonts.css from whatever is on disk, so it stays correct even on the
   * skip path above. unicode-range is dropped: with only latin subsets present,
   * ranges would let the browser skip loading a face whose glyphs it thinks it
   * doesn't need, and we'd rather always have the real face. */
  const lines = [
    "/* Generated by .design-sync/prepare-css.mjs — do not edit by hand.",
    " * Self-hosted Montserrat (the app gets this from next/font, which the",
    " * design-system bundle has no access to). Wired via cfg.extraFonts. */",
    "",
  ];
  for (const w of WEIGHTS) {
    for (const s of SUBSETS) {
      const name = `Montserrat-${w}-${s}.woff2`;
      if (!existsSync(resolve(FONT_DIR, name))) continue;
      /* Double quotes, not single: this file is committed, so `biome ci .`
       * formats it — emitting biome's preferred style keeps CI green without
       * having to exclude a generated file from the check. */
      lines.push(
        "@font-face {",
        '  font-family: "Montserrat";',
        "  font-style: normal;",
        `  font-weight: ${w};`,
        "  font-display: swap;",
        `  src: url("./fonts/${name}") format("woff2");`,
        "}",
        "",
      );
    }
  }
  writeFileSync(FONTS_CSS, lines.join("\n"));
  log(
    `wrote fonts.css (${lines.filter((l) => l === "@font-face {").length} faces)`,
  );

  // --- tailwind ----------------------------------------------------------
  if (!existsSync(TW_CLI)) {
    throw new Error(
      `Tailwind CLI missing at ${TW_CLI} — run: (cd .ds-sync && npm i @tailwindcss/cli@4.3.2)`,
    );
  }
  log("compiling Tailwind from .design-sync/ds-entry.css");
  const tmp = resolve(dirname(OUT_CSS), "tailwind.css");
  execFileSync(
    process.execPath,
    [TW_CLI, "-i", ".design-sync/ds-entry.css", "-o", tmp],
    {
      cwd: ROOT,
      stdio: ["ignore", "ignore", "inherit"],
    },
  );
  const tw = readFileSync(tmp, "utf8");

  /* globals.css maps the font utilities onto `var(--font-sans)` /
   * `var(--font-heading)`, which next/font defines at runtime and nothing
   * defines here. Unlayered :root beats Tailwind's @layer theme, so these win. */
  const head = [
    "/* Generated by .design-sync/prepare-css.mjs — do not edit by hand.",
    " * Compiled Tailwind v4 output for buli-hub + the font variables that",
    " * next/font would otherwise supply. Wired via cfg.cssEntry. */",
    ":root {",
    "  --font-sans: 'Montserrat', ui-sans-serif, system-ui, sans-serif;",
    "  --font-heading: 'Montserrat', ui-sans-serif, system-ui, sans-serif;",
    "}",
    "",
  ].join("\n");
  writeFileSync(OUT_CSS, `${head}${tw}`);
  log(`wrote ds.css (${(tw.length / 1024).toFixed(0)} KB compiled)`);

  // --- entry -------------------------------------------------------------
  const cfg = JSON.parse(readFileSync(CONFIG, "utf8"));
  /* `null` values are deliberate exclusions (subparts that ride on the global
   * but get no card) — they name no file, so drop them before building the
   * file list. */
  const files = [
    ...new Set(Object.values(cfg.componentSrcMap ?? {}).filter(Boolean)),
  ].sort();
  if (!files.length)
    throw new Error(
      "cfg.componentSrcMap is empty — nothing to build an entry from",
    );
  for (const f of files) {
    if (!existsSync(resolve(ROOT, f)))
      throw new Error(`componentSrcMap path does not exist: ${f}`);
  }
  /* next/link reads a batch of process.env.__NEXT_* flags at module scope. The
   * converter defines process.env.NODE_ENV, but not those, so they stay as real
   * runtime lookups — and with no `process` in the browser the bundle threw
   * ReferenceError before it could assign window.VgcGemeinde (every component
   * then reported [BUNDLE_EXPORT] + "process is not defined"). An empty env
   * object gives every flag the same `undefined` Next sees when it's unset.
   *
   * This must run FIRST: it's a bare `import` ahead of the `export *` list, and
   * ES modules evaluate imports in source order. */
  writeFileSync(
    OUT_SHIM,
    [
      "// Generated by .design-sync/prepare-css.mjs — do not edit by hand.",
      "globalThis.process ??= { env: {} };",
      "globalThis.process.env ??= {};",
      "",
    ].join("\n"),
  );
  writeFileSync(
    OUT_ENTRY,
    [
      "// Generated by .design-sync/prepare-css.mjs — do not edit by hand.",
      "// Synthesized package entry: every file referenced by cfg.componentSrcMap.",
      "",
      `import ${JSON.stringify(OUT_SHIM)};`,
      "",
      ...files.map((f) => `export * from ${JSON.stringify(resolve(ROOT, f))};`),
      "",
    ].join("\n"),
  );
  log(
    `wrote entry.mjs (${files.length} files, ${Object.keys(cfg.componentSrcMap).length} mapped components)`,
  );

  /* --- types entry -------------------------------------------------------
   * The converter resolves each component's prop contract by looking up the
   * package's TYPES entry — `pkgJson.types` or, failing that, <root>/index.d.ts
   * — and reading its exported declarations. buli-hub ships neither, so every
   * emitted <Name>.d.ts came back as an empty `[key: string]: unknown`, which
   * is exactly the API contract the design agent reads. Re-exporting the same
   * sources from a root index.d.ts gives ts-morph a real entry to walk, and the
   * props come out fully resolved (Button gets its variant/size unions back).
   *
   * Gitignored, and excluded from tsconfig so the app's own `tsc --noEmit` and
   * `next build` never see it. */
  writeFileSync(
    OUT_DTS,
    [
      "// Generated by .design-sync/prepare-css.mjs — do not edit by hand, do not commit.",
      "// Types entry for the design-sync converter only (see .design-sync/NOTES.md).",
      "",
      ...files.map(
        (f) =>
          `export * from ${JSON.stringify(`./${f.replace(/\.tsx?$/, "")}`)};`,
      ),
      "",
    ].join("\n"),
  );
  log(`wrote index.d.ts (types entry, ${files.length} re-exports)`);
}

main().catch((err) => {
  process.stderr.write(`[prepare-css] FAILED: ${err.message}\n`);
  process.exit(1);
});
