import { clearAuthCookiesAtScopes, createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  MAINTENANCE_PAGE_PATH,
  MAINTENANCE_RETRY_AFTER_SECONDS,
  maintenanceMode,
  maintenanceRoute,
} from "@/features/maintenance/mode";
import { PATH_HEADER } from "@/features/usage/path-header";
import {
  legacySessionKey,
  sessionCookieOptions,
} from "@/lib/supabase/cookie-options";
import { supabaseEnv } from "@/lib/supabase/env";

// Refreshes expired Supabase auth tokens on navigation and keeps the
// request + response cookies in sync (Next 16 proxy convention).
export async function proxy(request: NextRequest) {
  // Maintenance first: while on, nothing but the legal pages reaches route
  // code, so no write can land during a database move
  // (specs/004-google-cloud-migration, contracts/maintenance.md).
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
    // The legal pages render without the session refresh below: it would
    // reach Supabase Auth, and during maintenance nobody is signed in.
    return NextResponse.next();
  }

  // Tell the server tree which path it renders: the root layout counts page
  // loads (src/features/usage/count-page-load.tsx) and a Server Component has
  // no other reliable way to learn its pathname. Set on the request before
  // any NextResponse.next({ request }) below, so every variant carries it.
  request.headers.set(PATH_HEADER, request.nextUrl.pathname);
  let response = NextResponse.next({ request });
  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookieOptions: sessionCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // The call itself triggers the token refresh; the result is not needed.
  await supabase.auth.getUser();

  // The shared session (specs/003-shared-discord-login) has a name of its own,
  // so the pre-switch session in the library's default cookie on this host is
  // never read again; clear it instead of letting the browser send it for a
  // year. The helper does nothing once it is gone.
  if (process.env.AUTH_COOKIE_DOMAIN) {
    await clearAuthCookiesAtScopes({
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
      storageKey: legacySessionKey(url),
      scopes: [{}],
    });
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
