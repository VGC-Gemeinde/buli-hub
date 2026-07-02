"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "../actions";
import type { DiscordIdentity } from "../identity";

export function UserMenu({
  identity,
  isStaff = false,
}: {
  identity: DiscordIdentity;
  isStaff?: boolean;
}) {
  const name = identity.displayName ?? "Discord-Nutzer";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md py-1 pr-2.5 pl-1 hover:bg-secondary data-[state=open]:bg-secondary [&[data-state=open]>svg]:rotate-180"
        >
          <Avatar className="size-7">
            {identity.avatarUrl ? (
              <AvatarImage src={identity.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-xs">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{name}</span>
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
        <form action={signOut}>
          <DropdownMenuItem asChild className="w-full font-medium">
            <button type="submit">Abmelden</button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
