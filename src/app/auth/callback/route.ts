import { NextResponse } from "next/server";
import { discordIdentityFromUser } from "@/features/auth/identity";
import {
  classifySignInError,
  SIGN_IN_ERROR_PARAM,
} from "@/features/auth/sign-in-error";
import { syncMember } from "@/features/roles/sync";
import { createClient } from "@/lib/supabase/server";

// OAuth callback: Discord redirects here (via Supabase Auth) with a code,
// which is exchanged for a session cookie. Kept as a thin wrapper on purpose
// (see docs/plans/discord-sign-in.md).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Behind Cloud Run's proxy, `request.url` reflects the container's own
  // listen address (0.0.0.0:8080), not the public domain — redirects must
  // use APP_BASE_URL. Locally it is unset and the request origin is correct.
  const base = process.env.APP_BASE_URL || origin;

  let exchangeError: string | null = null;
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Best-effort member sync — a Discord failure never blocks sign-in;
      // getRole revalidates on read anyway.
      try {
        await syncMember(data.user.id, discordIdentityFromUser(data.user));
      } catch (syncError) {
        console.error("Member sync at sign-in failed:", syncError);
      }
      return NextResponse.redirect(base);
    }
    exchangeError = error.message;
  }

  // Supabase Auth reports its own rejections (e.g. Discord returned no
  // verified email) as `error`/`error_description` instead of a code. The raw
  // strings stay here in the log; only the category reaches the UI.
  const failure = {
    error: searchParams.get("error"),
    description: searchParams.get("error_description"),
    exchangeError,
  };
  const kind = classifySignInError(failure);
  console.error(`Sign-in failed (${kind}):`, failure);
  return NextResponse.redirect(`${base}/?${SIGN_IN_ERROR_PARAM}=${kind}`);
}
