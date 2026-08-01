"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Tick } from "@/components/tick";
import { cn } from "@/lib/utils";

export type ChapterLink = {
  id: string;
  number: number;
  title: string;
};

/** Where a chapter heading counts as „reached" — just below the site header. */
const ACTIVE_OFFSET = 160;

// The active chapter is the last one whose heading has passed the offset. A
// scroll listener rather than IntersectionObserver: „last heading above a line"
// is a single reduction over positions, where the observer would need its
// entries reconciled into the same answer. Passive, and it never touches the
// URL — writing the hash on scroll floods the history.
function useActiveChapter(chapters: ChapterLink[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    function update() {
      let current: string | null = null;
      for (const chapter of chapters) {
        const element = document.getElementById(chapter.id);
        if (element && element.getBoundingClientRect().top <= ACTIVE_OFFSET) {
          current = chapter.id;
        }
      }
      setActive(current);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [chapters]);

  return active;
}

function ChapterLinks({ chapters }: { chapters: ChapterLink[] }) {
  const active = useActiveChapter(chapters);

  return (
    <div className="flex flex-col gap-0.5 border-t pt-2.5">
      {chapters.map((chapter) => {
        const isActive = chapter.id === active;
        return (
          <a
            key={chapter.id}
            href={`#${chapter.id}`}
            className={cn(
              // min-h-11 keeps the touch target at 44px on mobile, where these
              // are the primary way through the document.
              "flex min-h-11 items-center gap-2 rounded-md px-2 py-1.5 text-sm lg:min-h-0",
              isActive
                ? "font-semibold text-brand-blue dark:text-white"
                : "font-medium text-muted-foreground hover:bg-secondary",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "inline-block size-1.5 shrink-0 -skew-x-[18deg]",
                isActive ? "bg-brand-orange" : "bg-border",
              )}
            />
            {chapter.number} · {chapter.title}
          </a>
        );
      })}
    </div>
  );
}

function Kicker() {
  return (
    <div className="flex items-center gap-2">
      <Tick size="s" color="neutral" />
      <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
        Inhalt
      </span>
    </div>
  );
}

function QuestionsHint() {
  return (
    <div className="border-t pt-4 text-[12.5px] text-muted-foreground leading-[1.55]">
      Fragen? Die beantworten wir im{" "}
      <a
        href="https://discord.gg/YeVggq5bgK"
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-brand-blue underline underline-offset-[3px] dark:text-white"
      >
        #fragen-antworten
      </a>
      -Kanal.
    </div>
  );
}

// Both variants take their visibility from the caller rather than hardcoding a
// breakpoint — otherwise the mobile one is unreachable in the /dev/ui gallery,
// which is viewed on a desktop.

/** Desktop: sticky sidebar beside the document. */
export function ChapterSidebar({
  chapters,
  className,
}: {
  chapters: ChapterLink[];
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "sticky flex w-56 shrink-0 flex-col gap-3 self-start",
        className,
      )}
      style={{ top: 24 }}
    >
      <Kicker />
      <ChapterLinks chapters={chapters} />
      <QuestionsHint />
    </aside>
  );
}

/**
 * Mobile: a collapsed list under the page head. Not sticky — a chapter list
 * pinned to a phone viewport eats a third of the screen, and the scroll-spy is
 * decorative once the list is closed anyway.
 */
export function ChapterDisclosure({
  chapters,
  className,
}: {
  chapters: ChapterLink[];
  className?: string;
}) {
  return (
    <details
      className={cn(
        "group rounded-lg border border-border bg-card px-4 py-3",
        className,
      )}
    >
      {/* A flex summary drops the native disclosure marker, so without the
          chevron the row gives no sign it opens at all. */}
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em] [&::-webkit-details-marker]:hidden">
        <Tick size="s" color="neutral" />
        Inhalt
        <ChevronDown
          aria-hidden
          className="ml-auto size-4 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-2.5">
        <ChapterLinks chapters={chapters} />
      </div>
    </details>
  );
}
