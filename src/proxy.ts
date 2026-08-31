import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { PATH_HEADER } from "@/features/usage/path-header";
import { supabaseEnv } from "@/lib/supabase/env";

// Refreshes expired Supabase auth tokens on navigation and keeps the
// request + response cookies in sync (Next 16 proxy convention).
export async function proxy(request: NextRequest) {
  // Tell the server tree which path it renders: the root layout counts page
  // loads (src/features/usage/count-page-load.tsx) and a Server Component has
  // no other reliable way to learn its pathname. Set on the request before
  // any NextResponse.next({ request }) below, so every variant carries it.
  request.headers.set(PATH_HEADER, request.nextUrl.pathname);
  let response = NextResponse.next({ request });
  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
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
