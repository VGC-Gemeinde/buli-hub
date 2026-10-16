"use client";

import { Tooltip } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// The definition behind a control that does something on click, such as a
// sortable column head or a filter chip (DESIGN.md §8.14). Drawn in a portal,
// so a scrolling table cannot clip it, and closed by the click itself; it
// opens on hover and on keyboard focus only. A standalone label that only
// explains uses <InfoLabel>, which also opens on a tap.
export function HoverHint({
  hint,
  align = "start",
  children,
}: {
  hint: ReactNode;
  align?: "start" | "end";
  // One element that takes a ref (a Link, a button).
  children: ReactNode;
}) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            align={align}
            sideOffset={8}
            collisionPadding={12}
            className={cn(
              "z-50 w-max max-w-[220px] rounded-lg bg-brand-blue px-2.5 py-2 text-left font-medium text-[12.5px] text-white normal-case leading-[1.45] tracking-normal shadow-lg dark:border dark:bg-popover dark:text-popover-foreground",
            )}
          >
            {hint}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
