"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// The Regelwerk's permanent, signed-out-reachable home. A client component
// only because the footer is server-rendered and the active state needs the
// pathname — marking the current page keeps the footer from looking like a
// dead link once you are already on it.
export function RegelwerkFooterLink() {
  const pathname = usePathname();
  const active = pathname === "/regelwerk";

  return (
    <Link
      href="/regelwerk"
      aria-current={active ? "page" : undefined}
      className={cn(
        active
          ? "font-semibold text-brand-blue dark:text-white"
          : "hover:text-foreground",
      )}
    >
      Regelwerk
    </Link>
  );
}
