"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

// Whether this tab has navigated inside the hub since it loaded. A detail
// page opened from a table goes back there; one opened from outside (a
// Discord link, a bookmark) has nowhere in the hub to go back to. Module
// state on purpose: it lives exactly as long as the client-side app, and
// `document.referrer` does not change on client-side navigation.
let navigatedInApp = false;
let firstPath: string | null = null;

// Mounted once in the root layout: notes the first client-side navigation.
export function NavigationMemory() {
  const pathname = usePathname();
  useEffect(() => {
    if (firstPath === null) {
      firstPath = pathname;
    } else if (pathname !== firstPath) {
      navigatedInApp = true;
    }
  }, [pathname]);
  return null;
}

// The back link of a detail page (a match, a player's profile, a teamsheet,
// docs/plans/site-navigation.md): these pages are not destinations of the
// navigation, so they carry the way back themselves. "Zurück" goes to the
// previous page in the hub; without one, to `fallbackHref`, the page's
// section.
export function BackLink({
  fallbackHref,
  className,
}: {
  fallbackHref: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <Link
      href={fallbackHref}
      onClick={(event) => {
        if (navigatedInApp) {
          event.preventDefault();
          router.back();
        }
      }}
      className={cn(
        "mb-4.5 inline-block font-medium text-[13px] text-muted-foreground hover:text-brand-blue dark:hover:text-white",
        className,
      )}
    >
      ← Zurück
    </Link>
  );
}
