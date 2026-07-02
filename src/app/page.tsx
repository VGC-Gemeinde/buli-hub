import { SignInButton } from "@/features/auth/components/sign-in-button";
import { UserMenu } from "@/features/auth/components/user-menu";
import { discordIdentityFromUser } from "@/features/auth/identity";
import { createClient } from "@/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { auth_error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-lg font-semibold">Buli Hub</span>
        {user ? (
          <UserMenu identity={discordIdentityFromUser(user)} />
        ) : (
          <SignInButton />
        )}
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          VGC Bundesliga
        </h1>
        <p className="text-muted-foreground">
          Die Turnierplattform der VGC Gemeinde.
        </p>
        {auth_error ? (
          <p className="text-destructive text-sm">
            Anmeldung fehlgeschlagen. Bitte versuche es erneut.
          </p>
        ) : null}
      </main>
    </div>
  );
}
