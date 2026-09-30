import Image from "next/image";
import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignInButton } from "@/features/auth/components/sign-in-button";
import { UserMenu } from "@/features/auth/components/user-menu";
import { SectionNav } from "@/features/navigation/components/section-nav";
import { type Section, sectionRow } from "@/features/navigation/sections";
import { getRegistration } from "@/features/registration/queries";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { currentSeason } from "@/features/season/season-status";
import { cn } from "@/lib/utils";

// Site chrome (design/NAVIGATION.md): the orange accent line, then one header
// in two tiers that share one left edge (28px, where the logo and the
// Divisionen workspace start). The main bar is the same on every page; the
// page's `section` is a tab that runs into that section's row below. A detail
// page marks its section and no row entry. Nothing in the header ever
// collapses or disappears.
export async function SiteHeader({
  className,
  section,
}: {
  className?: string;
  section?: Section;
}) {
  const current = await currentUser();
  const isStaff = current !== null && roleAtLeast(current.role, "staff");
  // One read for both: the Liga entry only exists while the public overview
  // is live, and the rows depend on the phase.
  const { window, phase } =
    current !== null
      ? await currentSeason()
      : { window: null, phase: "not_started" as const };
  const registrationRelevant =
    current !== null && section === "spieler"
      ? phase === "registration_open" ||
        (window !== null &&
          (await getRegistration(window.id, current.userId)) !== null)
      : false;
  const row =
    current !== null && section
      ? sectionRow(section, {
          phase,
          role: isStaff ? current.role : null,
          registrationRelevant,
        })
      : null;

  return (
    <div className={className}>
      <div className="h-[3px] bg-brand-orange" />
      <header
        className={cn(
          "grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3.5 bg-background px-4 pt-2 sm:gap-x-9 sm:px-7 sm:pt-3",
          // With a row under it the row closes the header; without one the
          // main bar does.
          row ? null : "border-b",
        )}
      >
        <Link
          href="/"
          className="flex h-12 shrink-0 items-center gap-3 sm:h-13"
        >
          <Image
            src="/logo.svg"
            alt="Buli Hub"
            width={41}
            height={28}
            className="rounded-md"
          />
          <span className="hidden font-semibold text-[17px] tracking-tight sm:inline">
            Buli Hub
          </span>
        </Link>
        <div className="h-12 min-w-0 sm:h-13">
          {current ? (
            <HeaderNav
              isStaff={isStaff}
              seasonRunning={phase === "regular_season"}
              section={section}
            />
          ) : null}
        </div>
        <div className="flex h-12 shrink-0 items-center gap-1 sm:h-13">
          {/* On a phone the theme switch lives in the user menu. */}
          <span className="hidden sm:flex">
            <ThemeToggle />
          </span>
          {current ? (
            <UserMenu
              displayName={current.displayName}
              avatarUrl={current.avatarUrl}
              isStaff={isStaff}
            />
          ) : (
            <SignInButton variant="outline" />
          )}
        </div>
      </header>
      {row ? <SectionNav groups={row} /> : null}
    </div>
  );
}
