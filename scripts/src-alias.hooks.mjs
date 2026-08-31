// Resolve hook behind src-alias.register.mjs: maps `@/x` to `src/x` and adds
// the `.ts` extension the source omits. Runs off-thread; keep it dependency
// free.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = new URL("../src/", import.meta.url);
const HAS_EXTENSION = /\.[cm]?[jt]sx?$/;

function withExtension(path) {
  if (HAS_EXTENSION.test(path) || existsSync(path)) return path;
  for (const suffix of [".ts", ".tsx", "/index.ts"]) {
    if (existsSync(path + suffix)) return path + suffix;
  }
  return path;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const url = new URL(specifier.slice(2), SRC);
    return nextResolve(
      pathToFileURL(withExtension(fileURLToPath(url))).href,
      context,
    );
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file:")
  ) {
    const url = new URL(specifier, context.parentURL);
    const resolved = withExtension(fileURLToPath(url));
    if (resolved !== fileURLToPath(url)) {
      return nextResolve(pathToFileURL(resolved).href, context);
    }
  }
  return nextResolve(specifier, context);
}
