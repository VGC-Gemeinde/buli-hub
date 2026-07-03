import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignInButton } from "@/features/auth/components/sign-in-button";
import { UserMenu } from "@/features/auth/components/user-menu";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";

// Site chrome per design/DESIGN.md: orange accent line + header.
export async function SiteHeader({ className }: { className?: string }) {
  const current = await currentUser();
  const isStaff = current !== null && roleAtLeast(current.role, "staff");

  return (
    <div className={className}>
      <div className="h-[3px] bg-brand-orange" />
      <header className="flex items-center justify-between border-b px-5 py-2.5">
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-3">
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
            <Link href="/spieler" className="flex items-center gap-2">
              <div className="h-2 w-4 -skew-x-[18deg] bg-brand-orange" />
              <span className="font-semibold text-brand-blue text-sm dark:text-white">
                Spieler-Dashboard
              </span>
            </Link>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
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
