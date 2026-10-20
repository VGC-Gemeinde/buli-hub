"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithDiscord() {
  const origin = (await headers()).get("origin");
  if (!origin) {
    throw new Error("Missing Origin header on sign-in request");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    throw new Error(`Discord sign-in failed: ${error.message}`);
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  // This browser only, on every Gemeinde site (the session cookie is shared);
  // the account's other devices stay signed in (specs/003-shared-discord-login,
  // clarification 2026-10-18).
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
