import type { MetadataRoute } from "next";

// Staging is served on a public but unguessable URL (docs/deployment.md §7).
// Nothing should link to it, but if something ever does, this keeps it out of
// search results — together with the X-Robots-Tag header set in src/proxy.ts.
//
// Keyed on APP_ENV=staging rather than on "not production", so production and
// local development need no configuration and cannot be de-indexed by a
// missing variable.
//
// Without force-dynamic the route is prerendered and APP_ENV is read at *build*
// time, so one image would serve production's robots.txt on staging.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (process.env.APP_ENV === "staging") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  // No `Disallow: /dev/` here: the tooling already 404s wherever
  // ENABLE_DEV_TOOLS is unset, so the rule would protect nothing while
  // publishing the path to anyone who reads robots.txt.
  return { rules: { userAgent: "*", allow: "/" } };
}
