import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@/features/auth/components/sign-in-button";
import { PublicLeague } from "@/features/public-league/components/public-league";
import { publicLeagueOverview } from "@/features/public-league/queries";
import { currentUser } from "@/features/roles/guard";
import { hasSchedule } from "@/features/schedule/queries";
import { getSeeding } from "@/features/seeding/queries";
import { latestWindow } from "@/features/staff/queries";
import { registrationState } from "@/features/staff/registration-window";
import { seasonPhase } from "@/features/staff/season-phase";
import { createClient } from "@/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const { auth_error } = await searchParams;

  // The landing page becomes the public league overview while a season runs.
  const window = await latestWindow();
  const state = window ? registrationState(window, new Date()) : "not_started";
  const seeding =
    window && state === "closed" ? await getSeeding(window.id) : null;
  const scheduleExists =
    window && seeding?.finalizedAt ? await hasSchedule(window.id) : false;
  const phase = seasonPhase({
    registration: state,
    seedingFinalized: Boolean(seeding?.finalizedAt),
    hasSchedule: scheduleExists,
  });

  if (phase === "regular_season" && window) {
    const today = new Date().toISOString().slice(0, 10);
    const [overview, current] = await Promise.all([
      publicLeagueOverview(window.id, window.seasonNumber, today),
      currentUser(),
    ]);
    return (
      <div className="flex flex-1 flex-col">
        <SiteHeader />
        <PublicLeague overview={overview} meId={current?.userId ?? ""} />
      </div>
    );
  }

  // Otherwise: the pre-/inter-season landing (anon sign-in / logged-in CTA).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <SiteHeader className="relative z-10 shrink-0" />
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 text-center">
        {user ? (
          <>
            <Image
              src="/logo.svg"
              alt=""
              width={132}
              height={91}
              className="mb-9 rounded-2xl shadow-xl"
            />
            <h1 className="mb-[18px] text-6xl leading-[1.05] text-brand-blue dark:text-white">
              VGC Bundesliga
            </h1>
            <p className="mb-7 max-w-[440px] text-[17px] text-muted-foreground">
              Deine Gruppe, dein Spielplan und deine nächste Paarung — alles im
              Spieler-Dashboard.
            </p>
            <Button asChild size="lg">
              <Link href="/spieler">Zum Spieler-Dashboard</Link>
            </Button>
          </>
        ) : (
          <>
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
          </>
        )}
      </main>
      <div className="absolute inset-x-0 bottom-[26px] z-10 flex items-center justify-center gap-3">
        <div className="h-[9px] w-5 -skew-x-[18deg] bg-brand-orange" />
        <span className="font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.16em]">
          Ausgerichtet von der VGC Gemeinde
        </span>
        <div className="h-[9px] w-5 -skew-x-[18deg] bg-brand-orange" />
      </div>
      {/* biome-ignore lint/performance/noImgElement: decorative watermark; next/image adds nothing for a local SVG */}
      <img
        src="/logo.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-28 z-0 w-[560px] -rotate-[10deg] rounded-[48px] opacity-5 dark:opacity-[0.06]"
      />
    </div>
  );
}
