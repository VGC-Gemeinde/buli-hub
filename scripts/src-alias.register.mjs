// Lets `node scripts/<x>.ts` import modules under src/ that use the app's
// `@/` alias and extension-less relative imports (tsconfig `paths`), which
// Node's built-in TypeScript support does not resolve on its own.
//
//   node --import ./scripts/load-env.mjs --import ./scripts/src-alias.register.mjs scripts/backfill-usage.ts
//
// Registers src-alias.hooks.mjs as a module resolve hook (node:module
// `register`, stable since Node 20.6).
import { register } from "node:module";

register("./src-alias.hooks.mjs", import.meta.url);
