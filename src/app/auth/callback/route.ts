import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth callback: Discord redirects here (via Supabase Auth) with a code,
// which is exchanged for a session cookie. Kept as a thin wrapper on purpose
// (see docs/plans/discord-sign-in.md).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(origin);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
