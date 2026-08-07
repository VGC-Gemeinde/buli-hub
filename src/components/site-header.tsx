import Image from "next/image";
import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignInButton } from "@/features/auth/components/sign-in-button";
import { UserMenu } from "@/features/auth/components/user-menu";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import { seasonIsRunning } from "@/features/season/season-status";

// Site chrome per design/DESIGN.md: orange accent line + header. Signed-in users
// get the top-level nav (§3); on a sub-page, `breadcrumb` collapses it into a
// trail whose root defaults to the Spieler-Dashboard (pass `breadcrumbRoot` to
// point elsewhere, e.g. the Staff-Bereich on staff match views).
export async function SiteHeader({
  className,
  breadcrumb,
  breadcrumbRoot,
}: {
  className?: string;
  breadcrumb?: string;
  breadcrumbRoot?: { href: string; label: string };
}) {
  const current = await currentUser();
  const isStaff = current !== null && roleAtLeast(current.role, "staff");
  // The "Liga" entry only appears while the public overview is live.
  const seasonRunning = current !== null ? await seasonIsRunning() : false;

  return (
    <div className={className}>
      <div className="h-[3px] bg-brand-orange" />
      <header className="flex items-center justify-between gap-4 border-b px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-7">
          <Link href="/" className="flex shrink-0 items-center gap-3">
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
          {current ? (
            <HeaderNav
              isStaff={isStaff}
              seasonRunning={seasonRunning}
              breadcrumb={breadcrumb}
              breadcrumbRoot={breadcrumbRoot}
            />
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
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
    </div>
  );
}
