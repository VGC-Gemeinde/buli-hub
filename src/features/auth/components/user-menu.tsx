"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Tick } from "@/components/tick";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { FeedbackDialog } from "@/features/feedback/components/feedback-dialog";
import { cn } from "@/lib/utils";
import { signOut } from "../actions";

// Items are 44px tall on a phone (touch), the stock height from `sm`.
const ITEM = "font-medium max-sm:h-11";

// The personal tier of the navigation (design/NAVIGATION.md §7): things about
// *me*, not sections. The sections are all in the header, so none of them is
// listed here. On `/profil` and `/regelwerk`, pages without a section, the
// menu is where "you are here" shows: an orange ring on the avatar and the
// item marked with the tick. On a phone the theme switch lives here too.
export function UserMenu({
  displayName,
  avatarUrl,
  isStaff = false,
}: {
  displayName: string | null;
  avatarUrl: string | null;
  isStaff?: boolean;
}) {
  const name = displayName ?? "Discord-Nutzer";
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const pathname = usePathname();
  const current = (href: string) => pathname === href;
  const onPersonalPage = current("/profil") || current("/regelwerk");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={name}
          className="flex items-center gap-1 rounded-md p-1 hover:bg-secondary data-[state=open]:bg-secondary [&[data-state=open]>svg]:rotate-180"
        >
          <Avatar
            className={cn(
              "size-7",
              onPersonalPage && "ring-2 ring-brand-orange",
            )}
          >
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-xs">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="hidden size-3.5 text-muted-foreground transition-transform sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-[220px] sm:w-48"
      >
        <DropdownMenuLabel className="font-medium text-muted-foreground text-xs">
          Angemeldet als {name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <PageItem href="/profil" label="Profil" current={current("/profil")} />
        {/* The footer link is the signed-out home of the ruleset; signed-in
            players look for it up here, next to everything else that is
            "theirs". */}
        <PageItem
          href="/regelwerk"
          label="Regelwerk"
          current={current("/regelwerk")}
        />
        <DropdownMenuItem
          className={ITEM}
          // Without preventDefault the menu closes first and takes the focus
          // with it, so the dialog opens unfocused.
          onSelect={(event) => {
            event.preventDefault();
            setFeedbackOpen(true);
          }}
        >
          Feedback geben
        </DropdownMenuItem>
        <div className="sm:hidden">
          <DropdownMenuSeparator />
          <DarkModeItem />
        </div>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild className={cn(ITEM, "w-full")}>
            <button type="submit">Abmelden</button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        canSubmitIdea={isStaff}
      />
    </DropdownMenu>
  );
}

function PageItem({
  href,
  label,
  current,
}: {
  href: string;
  label: string;
  current: boolean;
}) {
  return (
    <DropdownMenuItem
      asChild
      className={cn(
        ITEM,
        current && "bg-accent font-semibold text-brand-blue dark:text-white",
      )}
    >
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className="flex items-center justify-between"
      >
        {label}
        {current ? <Tick size="s" /> : null}
      </Link>
    </DropdownMenuItem>
  );
}

// "Dunkles Design" with a switch, the phone's replacement for the header's
// theme toggle (same next-themes logic). The menu stays open on toggle.
function DarkModeItem() {
  const { resolvedTheme, setTheme } = useTheme();
  // The resolved theme is unknown on the server; render the state only after
  // mount (standard next-themes pattern, as in ThemeToggle).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <DropdownMenuItem
      className={cn(ITEM, "justify-between")}
      onSelect={(event) => {
        event.preventDefault();
        setTheme(dark ? "light" : "dark");
      }}
    >
      Dunkles Design
      <Switch
        checked={dark}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none"
      />
    </DropdownMenuItem>
  );
}
