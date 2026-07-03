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
        <div className="flex items-center gap-1">
          {current ? (
            <Link
              href="/spieler"
              className="mr-1 rounded-md px-3 py-1.5 font-medium text-sm hover:bg-secondary"
            >
              Spieler-Dashboard
            </Link>
          ) : null}
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
