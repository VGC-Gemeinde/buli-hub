"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type * as React from "react";
import { DayPicker } from "react-day-picker";
import { de } from "react-day-picker/locale";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// German-locale month calendar (Monday-first, German month/day names) built on
// react-day-picker. Styling maps the day-picker parts to the app's Tailwind
// tokens; the picked day uses the brand accent.
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={de}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "font-medium text-sm",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 p-0",
        ),
        button_next: cn(buttonVariants({ variant: "outline" }), "size-7 p-0"),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 font-normal text-[0.8rem] text-muted-foreground",
        week: "mt-2 flex w-full",
        day: "size-9 p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal",
        ),
        today: "rounded-md bg-accent text-accent-foreground",
        selected:
          "[&>button]:rounded-md [&>button]:bg-brand-blue [&>button]:text-white dark:[&>button]:bg-white dark:[&>button]:text-brand-blue",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  );
}
