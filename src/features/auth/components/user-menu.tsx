"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeedbackDialog } from "@/features/feedback/components/feedback-dialog";
import { signOut } from "../actions";

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={name}
          className="flex items-center gap-1 rounded-md p-1 hover:bg-secondary data-[state=open]:bg-secondary [&[data-state=open]>svg]:rotate-180"
        >
          <Avatar className="size-7">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-xs">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="size-3.5 text-muted-foreground transition-transform" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-48">
        <DropdownMenuLabel className="font-medium text-muted-foreground text-xs">
          Angemeldet als {name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="font-medium">
          <Link href="/profil">Profil</Link>
        </DropdownMenuItem>
        {isStaff ? (
          <DropdownMenuItem asChild className="font-medium">
            <Link href="/staff" className="flex items-center justify-between">
              Staff-Bereich
              <div className="h-[7px] w-3.5 -skew-x-[18deg] bg-brand-orange" />
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="font-medium"
          // Without preventDefault the menu closes first and takes the focus
          // with it, so the dialog opens unfocused.
          onSelect={(event) => {
            event.preventDefault();
            setFeedbackOpen(true);
          }}
        >
          Feedback geben
        </DropdownMenuItem>
        <form action={signOut}>
          <DropdownMenuItem asChild className="w-full font-medium">
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
