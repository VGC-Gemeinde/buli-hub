import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A short label whose longer definition sits behind it (DESIGN.md §8.14,
// constitution Principle V: definitions behind short labels, not on the
// page). CSS only: the box shows on hover and on keyboard focus, and a tap on
// a phone focuses the label's button, so it opens there too. No client JS.

const BOX =
  "pointer-events-none invisible absolute top-[calc(100%+8px)] z-30 w-max max-w-[220px] rounded-lg bg-brand-blue px-2.5 py-2 text-left font-medium text-[12.5px] text-white normal-case leading-[1.45] tracking-normal opacity-0 shadow-lg transition-opacity dark:border dark:bg-popover dark:text-popover-foreground";

const SHOW =
  "group-hover/info:visible group-hover/info:opacity-100 group-focus-visible/info:visible group-focus-visible/info:opacity-100 group-focus/info:visible group-focus/info:opacity-100";

// The box alone, for a control that is already focusable (a sortable column
// head): the control carries `group/info`.
export function InfoTooltip({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <span
      role="tooltip"
      className={cn(BOX, SHOW, align === "right" ? "-right-1.5" : "-left-1.5")}
    >
      {children}
    </span>
  );
}

export function InfoLabel({
  label,
  children,
  align = "left",
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    // A button, so a keyboard or a tap can open the definition.
    <button
      type="button"
      className={cn(
        "group/info relative inline-block cursor-help bg-transparent p-0 text-inherit outline-offset-2 [font:inherit] [letter-spacing:inherit] [text-transform:inherit]",
        className,
      )}
    >
      <span className="underline decoration-dotted decoration-muted-foreground/60 underline-offset-[3px]">
        {label}
      </span>
      <InfoTooltip align={align}>{children}</InfoTooltip>
    </button>
  );
}
