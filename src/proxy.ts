import { type NextRequest, NextResponse } from "next/server";
import {
  MAINTENANCE_PAGE_PATH,
  MAINTENANCE_RETRY_AFTER_SECONDS,
  maintenanceMode,
  maintenanceRoute,
} from "@/features/maintenance/mode";
import { PATH_HEADER } from "@/features/usage/path-header";
import {
  isLegacySupabaseCookie,
  sessionCookie,
} from "@/lib/auth/cookie-options";

// Runs before every page and route (Next 16 proxy convention). Never touches
// the database: Next advises against data fetching here, since it also runs
// for every prefetch. The session itself is checked by currentUser()
// (specs/004-google-cloud-migration, research.md R9).
export async function proxy(request: NextRequest) {
  // Maintenance first: while on, nothing but the legal pages reaches route
  // code, so no write can land during a database move (contracts/maintenance.md).
  if (maintenanceMode()) {
    const route = maintenanceRoute(request.nextUrl.pathname);
    if (route === "json") {
      return NextResponse.json(
        { error: "maintenance" },
        {
          status: 503,
          headers: { "Retry-After": String(MAINTENANCE_RETRY_AFTER_SECONDS) },
        },
      );
    }
    if (route === "page") {
      const response = NextResponse.rewrite(
        new URL(MAINTENANCE_PAGE_PATH, request.url),
        { status: 503 },
      );
      response.headers.set(
        "Retry-After",
        String(MAINTENANCE_RETRY_AFTER_SECONDS),
      );
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
  }

  // Tell the server tree which path it renders: the root layout counts page
  // loads (src/features/usage/count-page-load.tsx) and a Server Component has
  // no other reliable way to learn its pathname. Set on the request before
  // NextResponse.next({ request }), so the response carries it.
  request.headers.set(PATH_HEADER, request.nextUrl.pathname);
  const response = NextResponse.next({ request });

  // Sliding expiry: every request that carries the session gets it back with
  // a fresh 30-day Max-Age, so the browser keeps it exactly as long as the
  // server does (contracts/session.md). Whether it is valid is decided later.
  const cookie = sessionCookie();
  const token = request.cookies.get(cookie.name)?.value;
  if (token) {
    response.cookies.set(cookie.name, token, cookie.options);
  }

  // Supabase's session from before the move is never read again; clear it
  // instead of letting the browser send it for a year.
  for (const { name } of request.cookies.getAll()) {
    if (isLegacySupabaseCookie(name)) {
      response.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
  }

  // Staging is served on a public but unguessable URL (docs/deployment.md §7).
  // Set here rather than in next.config.ts `headers()`, which is baked into
  // the build — this reads the Cloud Run environment at request time, so the
  // same image behaves correctly wherever it runs. Pairs with app/robots.ts.
  if (process.env.APP_ENV === "staging") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
