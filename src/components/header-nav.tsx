"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tick } from "@/components/tick";
import { cn } from "@/lib/utils";

// The signed-in header navigation (DESIGN.md §3). Top-level entries — "Liga"
// (only while a season runs), "Spieler-Dashboard", and "Staff-Bereich" (staff
// only) — each with a tick that is orange when active, neutral otherwise. On a
// sub-page a `breadcrumb` collapses the nav into a trail "{root} / {current}".
export function HeaderNav({
  isStaff,
  seasonRunning,
  breadcrumb,
  breadcrumbRoot,
}: {
  isStaff: boolean;
  seasonRunning: boolean;
  breadcrumb?: string;
  breadcrumbRoot?: { href: string; label: string };
}) {
  const pathname = usePathname();

  if (breadcrumb) {
    const root = breadcrumbRoot ?? {
      href: "/spieler",
      label: "Spieler-Dashboard",
    };
    return (
      <div className="flex items-center gap-2.5">
        <Link href={root.href} className="flex items-center gap-2">
          <Tick size="s" color="neutral" />
          <span className="font-medium text-muted-foreground text-sm hover:text-brand-blue dark:hover:text-white">
            {root.label}
          </span>
        </Link>
        <span className="text-[13px] text-border">/</span>
        <span className="font-semibold text-brand-blue text-sm dark:text-white">
          {breadcrumb}
        </span>
      </div>
    );
  }

  const entries = [
    ...(seasonRunning ? [{ href: "/", label: "Liga" }] : []),
    { href: "/spieler", label: "Spieler-Dashboard" },
    ...(isStaff ? [{ href: "/staff", label: "Staff-Bereich" }] : []),
  ];
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {entries.map((entry) => {
        const active = isActive(entry.href);
        return (
          <Link
            key={entry.href}
            href={entry.href}
            aria-current={active ? "page" : undefined}
            className="flex items-center gap-2"
          >
            <Tick size="s" color={active ? "orange" : "neutral"} />
            <span
              className={cn(
                "whitespace-nowrap text-sm",
                active
                  ? "font-semibold text-brand-blue dark:text-white"
                  : "font-medium text-muted-foreground hover:text-brand-blue dark:hover:text-white",
              )}
            >
              {entry.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
