import Image from "next/image";
import { ActionLink } from "@/components/links";
import { Tick } from "@/components/tick";
import { DISCORD_INVITE_URL } from "@/lib/discord-invite";

// The page every route shows during maintenance (specs/004-google-cloud-migration,
// mockups/wartung.html, approved 2026-10-21). The landing anatomy without
// sign-in or navigation: neither works while the hub is down. Generic on
// purpose, so the same switch serves any later maintenance. The footer comes
// from the root layout, reduced to the legal links.
export function MaintenancePage() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="h-[3px] shrink-0 bg-brand-orange" />
      <header className="relative z-10 flex items-center border-b px-4 pt-2 sm:px-7 sm:pt-3">
        <div className="flex h-12 items-center gap-3 sm:h-13">
          <Image
            src="/logo.svg"
            alt="Buli Hub"
            width={41}
            height={28}
            className="rounded-md"
          />
          <span className="font-semibold text-[17px] tracking-tight">
            Buli Hub
          </span>
        </div>
      </header>
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        <Image
          src="/logo.svg"
          alt=""
          width={132}
          height={91}
          className="mb-8 w-[104px] rounded-2xl shadow-xl sm:mb-9 sm:w-[132px]"
        />
        <div className="mb-3.5 flex items-center gap-2.5 font-semibold text-[12.5px] text-muted-foreground uppercase tracking-[0.12em]">
          <Tick size="s" />
          Wartung
          <Tick size="s" />
        </div>
        <h1 className="mb-4 text-balance text-[32px] text-brand-blue leading-[1.05] sm:text-[40px] dark:text-white">
          Gleich wieder da
        </h1>
        <p className="max-w-[44ch] text-[15px] text-muted-foreground leading-[1.65]">
          Der Buli Hub wird gerade gewartet und ist für kurze Zeit nicht
          erreichbar.
        </p>
        <p className="mt-3 max-w-[44ch] text-[15px] text-muted-foreground leading-[1.65]">
          Schau in etwa einer Stunde wieder vorbei.
        </p>
        <ActionLink href={DISCORD_INVITE_URL} className="mt-6 text-[14px]">
          Neuigkeiten im Discord der VGC Gemeinde
        </ActionLink>
      </main>
      {/* biome-ignore lint/performance/noImgElement: decorative watermark; next/image adds nothing for a local SVG */}
      <img
        src="/logo.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-28 z-0 w-[460px] -rotate-[10deg] rounded-[40px] opacity-5 sm:w-[560px] dark:opacity-[0.06]"
      />
    </div>
  );
}
