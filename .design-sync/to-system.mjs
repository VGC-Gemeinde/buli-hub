#!/usr/bin/env node
/*
 * design-sync output (ds-bundle/) -> files of the "VGC Gemeinde Design System"
 * artifact (a Claude Design System artifact since 2026-10-18; see NOTES.md).
 *
 * The converter still emits the claude.ai/design layout. This reproduces, byte
 * for byte, what the artifact's migration made of that layout, so a re-sync
 * changes only what the code changed:
 *
 *   _ds_bundle.js                          -> components/bundle.js
 *   _ds_bundle.css minus the token blocks  -> components/bundle.css
 *   components/<g>/<Name>/<Name>.d.ts      -> components/<Name>/<Name>.d.ts (+ all in components/index.d.ts)
 *   components/<g>/<Name>/<Name>.prompt.md -> components/<Name>/README.md
 *   components/<g>/<Name>/<Name>.html      -> components/<Name>/preview.html (the frame preloads styles and bundle)
 *   components/<g>/<Name>/<Name>.jsx       -> components/<g>/<Name>/<Name>.jsx
 *   _preview/<Name>.js, guidelines/**      -> same paths
 *   README.md                              -> the system's own header + the fresh generated body
 *
 * tokens.json / tokens.css are NOT generated: the artifact owns the token
 * values (the page edits them). A token change in globals.css is applied to
 * tokens.json by hand, and tokens.css rewritten in the page's compiled layout.
 *
 *   node .design-sync/to-system.mjs --sys <dir> --out <dir>
 *
 * --sys holds the published README.md read back from the artifact (its header
 * is kept). --out receives project/<path> for every file to publish, plus
 * removed.json: the paths of components the system has and the build no longer
 * produces (publish them as null).
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

const ROOT = resolve(import.meta.dirname, "..");
const DS = join(ROOT, "ds-bundle");
const { values } = parseArgs({
  options: { sys: { type: "string" }, out: { type: "string" } },
});
if (!values.sys || !values.out) {
  throw new Error("usage: to-system.mjs --sys <dir> --out <dir>");
}
const SYS = resolve(values.sys);
const OUT = resolve(values.out, "project");
const HDR = "import * as React from 'react';\n\n";
// One index line too many would hit the artifact's 24-section cap; this file
// is only an index of the legacy decisions.
const SKIP = new Set(["guidelines/docs/decisions/README.md"]);

const must = (s, a, b, what) => {
  if (!s.includes(a)) throw new Error(`${what}: missing ${a.slice(0, 70)}`);
  return s.replace(a, b);
};

// The values tokens.json owns leave the stylesheet (one source for every value).
export function lift(css) {
  let out = css.replace(
    /:root \{\n {2}--font-sans: [^\n]*\n {2}--font-heading: [^\n]*\n\}\n/,
    "/* Design System migration: the brand colours (light + dark), --radius, --spacing and the\n * --font-sans / --font-heading stacks are declared in tokens.css, compiled from tokens.json. */\n",
  );
  for (const line of [
    "    --font-sans: var(--font-sans);\n",
    "    --spacing: 0.25rem;\n",
    "    --font-heading: var(--font-heading);\n",
  ]) {
    out = must(out, line, "", "lift");
  }
  for (const sel of [":root", "\\.dark"]) {
    const re = new RegExp(`\\n${sel} \\{\\n[\\s\\S]*?\\n\\}\\n`);
    if (!re.test(out)) throw new Error(`lift: no top-level ${sel}`);
    out = out.replace(re, "\n");
  }
  return out;
}

export function previewHtml(html, name) {
  const lines = html.split("\n");
  lines[0] = lines[0].replace(/ viewport="(\d+)x(\d+)"/, " width=$1 height=$2");
  let out = lines.join("\n");
  for (const tag of [
    '  <link rel="stylesheet" href="../../../styles.css">\n',
    '  <link rel="stylesheet" href="../../../_ds_bundle.css">\n',
    '  <script src="../../../_vendor/react.js"></script>\n',
    '  <script src="../../../_vendor/react-dom.js"></script>\n',
    '  <script src="../../../_ds_bundle.js"></script>\n',
  ]) {
    out = must(out, tag, "", name);
  }
  out = out
    .replace(
      '<meta charset="utf-8">\n',
      `<meta charset="utf-8">\n  <title>${name} — preview</title>\n`,
    )
    .replace(
      "body{margin:0;padding:24px;background:#fff}",
      "body{margin:0;padding:24px;background:var(--background);color:var(--foreground)}",
    )
    .replace("border:1px solid #e5e7eb;", "border:1px solid var(--border);")
    .replace("color:#6b7280;", "color:var(--muted-foreground);")
    .replaceAll("../../../_preview/", "../../_preview/")
    .replace(
      `no PascalCase exports in _preview/${name}.js`,
      `no PascalCase exports in ../../_preview/${name}.js`,
    );
  return out;
}

function readme(sysReadme, dsReadme) {
  const MARK = "# VgcGemeinde (buli-hub@0.1.0)";
  if (!sysReadme.includes(MARK) || !dsReadme.includes(MARK)) {
    throw new Error("README: generated body marker missing");
  }
  const head = sysReadme.slice(0, sysReadme.indexOf(MARK));
  let body = dsReadme.slice(dsReadme.indexOf(MARK));
  const swaps = [
    [
      "- `_ds_bundle.js` — the whole-DS bundle at the project root; loads",
      "- `components/bundle.js` — the whole-DS bundle; loads",
    ],
    [
      "it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`).",
      "it `@import`s the tokens and fonts (`tokens.css`) and component styles (`components/bundle.css`).",
    ],
    [
      "- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).",
      "- `components/<Name>/README.md` (example JSX + variants), `components/<Name>/<Name>.d.ts` (types), `components/<Name>/preview.html` (variant grid).",
    ],
    [
      "- `tokens/*.css` — CSS custom properties, names verbatim from upstream.",
      "- `tokens.css` — CSS custom properties, names verbatim from upstream.",
    ],
    [
      "- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).",
      "- `fonts/` — `@font-face` files, declared in `tokens.css` (when the package ships fonts).",
    ],
    [
      'read_file("components/<group>/<Name>/<Name>.prompt.md")',
      'read_file("components/<Name>/README.md")',
    ],
    [
      '<script src="_ds_bundle.js"></script>',
      '<script src="components/bundle.js"></script>',
    ],
    [
      "They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).\n",
      "They are declared inside `components/bundle.css` (this DS ships one compiled stylesheet rather than separate token files).\nThe brand colours (light and dark), the zone, form and type colours, `--radius`, `--spacing`, `--font-sans` and `--font-heading` are declared in `tokens.json`, compiled to `tokens.css`.\n",
    ],
  ];
  for (const [a, b] of swaps) body = must(body, a, b, "README");
  const docs = walk("guidelines").filter(
    (f) => !SKIP.has(f) && !f.endsWith("index.md"),
  ).length;
  body = body
    .replace(
      /\(\d+ doc\(s\), see `guidelines\/index\.md`\)/,
      `(${docs} doc(s), see \`guidelines/index.md\`)`,
    )
    // The header explains NextAppRouter; the converter's generic provider
    // paragraph ("theme/i18n from context") would mislead.
    .replace(
      /Wrap the tree in the provider[^\n]*\n\n```jsx\n<NextAppRouter>\{children\}<\/NextAppRouter>\n```\n\n/,
      "",
    );
  if (/_ds_bundle|prompt\.md|<group>/.test(body)) {
    throw new Error("README: a design-sync path survived");
  }
  return head + body;
}

function walk(rel) {
  return readdirSync(join(DS, rel), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(rel, e.name)) : [join(rel, e.name)],
  );
}

const written = [];
function put(rel, text) {
  mkdirSync(dirname(join(OUT, rel)), { recursive: true });
  writeFileSync(join(OUT, rel), text);
  written.push(rel);
}

const comps = [];
for (const g of readdirSync(join(DS, "components"))) {
  for (const n of readdirSync(join(DS, "components", g))) comps.push([g, n]);
}
comps.sort((a, b) => a[1].toLowerCase().localeCompare(b[1].toLowerCase()));

const dts = [];
for (const [g, n] of comps) {
  const dir = join(DS, "components", g, n);
  const rd = (f) => readFileSync(join(dir, f), "utf8");
  const t = rd(`${n}.d.ts`);
  if (!t.startsWith(HDR)) throw new Error(`${n}.d.ts: unexpected header`);
  dts.push(t.slice(HDR.length));
  put(`components/${n}/${n}.d.ts`, t);
  put(
    `components/${n}/README.md`,
    rd(`${n}.prompt.md`).replace(
      "(bundle loaded from the root `_ds_bundle.js`)",
      "(bundle loaded from `components/bundle.js`)",
    ),
  );
  put(`components/${n}/preview.html`, previewHtml(rd(`${n}.html`), n));
  put(
    `components/${g}/${n}/${n}.jsx`,
    rd(`${n}.jsx`).replace(
      "Implementation is in the root _ds_bundle.js",
      "Implementation is in components/bundle.js",
    ),
  );
  const pv = join(DS, "_preview", `${n}.js`);
  if (existsSync(pv)) put(`_preview/${n}.js`, readFileSync(pv, "utf8"));
}
put("components/index.d.ts", HDR + dts.join("\n"));

const js = readFileSync(join(DS, "_ds_bundle.js"), "utf8");
if (/<\/script|<!--/i.test(js)) {
  throw new Error("bundle contains </script or <!-- (consumers inline it)");
}
if (js.length > 6 * 1024 * 1024) throw new Error("bundle over the 6 MB cap");
put("components/bundle.js", js);
put(
  "components/bundle.css",
  lift(readFileSync(join(DS, "_ds_bundle.css"), "utf8")),
);

for (const f of walk("guidelines")) {
  if (SKIP.has(f)) continue;
  let text = readFileSync(join(DS, f), "utf8");
  if (f === "guidelines/index.md") {
    text = text
      .split("\n")
      .filter((l) => ![...SKIP].some((s) => l.includes(s.slice(11))))
      .join("\n");
  }
  put(f, text);
}

put(
  "README.md",
  readme(
    readFileSync(join(SYS, "README.md"), "utf8"),
    readFileSync(join(DS, "README.md"), "utf8"),
  ),
);

// Components the published README lists that the build no longer has.
const now = new Set(comps.map((c) => c[1]));
const removed = [];
let group = null;
for (const line of readFileSync(join(SYS, "README.md"), "utf8").split("\n")) {
  const g = line.match(/^### (\S+)/);
  if (g) group = g[1];
  const c = line.match(/^- `([A-Z]\w*)`/);
  if (c && group && !now.has(c[1])) {
    const n = c[1];
    removed.push(
      `project/components/${n}/${n}.d.ts`,
      `project/components/${n}/README.md`,
      `project/components/${n}/preview.html`,
      `project/components/${group}/${n}/${n}.jsx`,
      `project/_preview/${n}.js`,
    );
  }
}
writeFileSync(
  join(values.out, "removed.json"),
  `${JSON.stringify(removed, null, 2)}\n`,
);
console.log(
  `to-system: ${comps.length} components, ${written.length} files, ${removed.length / 5} removed`,
);
