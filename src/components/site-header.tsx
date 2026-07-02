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
      <header className="flex items-center justify-between border-b px-7 py-3">
        <Link href="/" className="flex items-center gap-3">
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
        </Link>
        <div className="flex items-center gap-1.5">
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
