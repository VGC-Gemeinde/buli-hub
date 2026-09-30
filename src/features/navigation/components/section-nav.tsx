"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { activeHref, type NavGroup } from "../sections";

// A label that always takes the width of its bold form (an invisible bold
// copy in the same grid cell), so marking another entry never shifts its
// neighbours.
function Label({ text }: { text: string }) {
  return (
    <span className="grid">
      <span className="col-start-1 row-start-1">{text}</span>
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 font-semibold"
      >
        {text}
      </span>
    </span>
  );
}

// The 3px orange "you are here" bar on the row's bottom edge.
function Bar() {
  return (
    <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-[2px] bg-brand-orange" />
  );
}

function Divider() {
  return (
    <span
      aria-hidden
      className="mx-1.5 h-4 w-px shrink-0 self-center bg-border sm:mx-2"
    />
  );
}

// A section's row, the second tier of the site header (design/NAVIGATION.md
// §3.3): full width, `bg-muted` continuing the active main entry's tab, the
// first label on the 28px edge the logo starts on. It lists only the
// section's real destinations. The current page carries the orange bar; a
// detail page (a match, a profile, a teamsheet) is none of them, so nothing
// is marked there and the page's own back link leads on. Scrolls sideways on
// a phone, fading at the right edge while more is hidden there, and opens
// scrolled to the current entry.
export function SectionNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const active = activeHref(groups, pathname);
  const ref = useRef<HTMLElement>(null);
  const [moreRight, setMoreRight] = useState(false);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) {
      return;
    }
    // Bring the current entry into view with 16px to spare. scrollLeft,
    // not scrollIntoView: that can scroll the page as well.
    const current = nav.querySelector<HTMLElement>('[data-current="true"]');
    if (current) {
      const right = current.offsetLeft + current.offsetWidth + 16;
      if (right > nav.clientWidth) {
        nav.scrollLeft = right - nav.clientWidth;
      }
    }
    const update = () =>
      setMoreRight(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1);
    update();
    nav.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      nav.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const tab =
    "relative flex shrink-0 items-center whitespace-nowrap px-3 text-[13.5px]";
  return (
    <nav
      ref={ref}
      aria-label="Bereich"
      className={cn(
        // The border as an inset shadow, so the current entry's bar can sit
        // on it inside the scroll container (a real border below would be
        // clipped away from the bar by the overflow).
        "flex h-11 items-stretch overflow-x-auto bg-muted px-1 shadow-[inset_0_-1px_0_var(--border)] [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden",
        moreRight &&
          "[mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]",
      )}
    >
      {groups.map((group, index) => (
        <Fragment key={group.key}>
          {index > 0 ? <Divider /> : null}
          {group.entries.map((entry) => {
            const current = entry.href === active;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={current ? "page" : undefined}
                data-current={current ? "true" : undefined}
                className={cn(
                  tab,
                  "transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2",
                  current
                    ? "font-semibold text-brand-blue dark:text-white"
                    : "font-medium text-muted-foreground hover:text-brand-blue dark:hover:text-white",
                )}
              >
                <Label text={entry.label} />
                {current ? <Bar /> : null}
              </Link>
            );
          })}
        </Fragment>
      ))}
    </nav>
  );
}
