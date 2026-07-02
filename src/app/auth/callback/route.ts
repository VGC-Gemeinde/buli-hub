import { NextResponse } from "next/server";
import { discordIdentityFromUser } from "@/features/auth/identity";
import { syncRole } from "@/features/roles/sync";
import { createClient } from "@/lib/supabase/server";

// OAuth callback: Discord redirects here (via Supabase Auth) with a code,
// which is exchanged for a session cookie. Kept as a thin wrapper on purpose
// (see docs/plans/discord-sign-in.md).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Best-effort role sync — a Discord failure never blocks sign-in;
      // getRole revalidates on read anyway.
      try {
        const identity = discordIdentityFromUser(data.user);
        await syncRole(data.user.id, identity.discordId);
      } catch (syncError) {
        console.error("Role sync at sign-in failed:", syncError);
      }
      return NextResponse.redirect(origin);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
