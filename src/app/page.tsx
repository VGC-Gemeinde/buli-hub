import Image from "next/image";
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
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="h-[3px] shrink-0 bg-brand-orange" />
      <header className="relative z-10 flex items-center justify-between border-b px-7 py-3">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="Buli Hub"
            width={44}
            height={30}
            className="rounded-md"
          />
          <span className="text-[17px] font-semibold tracking-tight">
            Buli Hub
          </span>
        </div>
        {user ? (
          <UserMenu identity={discordIdentityFromUser(user)} />
        ) : (
          <SignInButton variant="outline" />
        )}
      </header>
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 text-center">
        <Image
          src="/logo.svg"
          alt=""
          width={148}
          height={102}
          className="mb-9 rounded-2xl shadow-xl"
        />
        <h1 className="mb-9 text-7xl leading-[1.05] text-brand-blue dark:text-white">
          VGC Bundesliga
        </h1>
        <SignInButton size="lg" />
        {auth_error ? (
          <p className="mt-5 text-destructive text-sm">
            Anmeldung fehlgeschlagen. Bitte versuche es erneut.
          </p>
        ) : null}
      </main>
      <div className="absolute inset-x-0 bottom-[26px] z-10 flex items-center justify-center gap-3">
        <div className="h-[9px] w-5 -skew-x-[18deg] bg-brand-orange" />
        <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Ausgerichtet von der VGC Gemeinde
        </span>
        <div className="h-[9px] w-5 -skew-x-[18deg] bg-brand-orange" />
      </div>
      {/* biome-ignore lint/performance/noImgElement: decorative watermark; next/image adds nothing for a local SVG */}
      <img
        src="/logo.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -right-24 z-0 w-[560px] -rotate-[10deg] rounded-[48px] opacity-5 dark:opacity-[0.06]"
      />
    </div>
  );
}
