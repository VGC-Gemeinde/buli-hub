import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "buli-hub";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { AVATAR_URL } from "./_fixtures";

/* Radix portals the menu, so a closed dropdown renders nothing at all —
 * `defaultOpen` is the static stand-in for the user having clicked the trigger.
 * cfg.overrides gives this component cardMode:"single" so the open panel is
 * painted inside the card instead of over its neighbours.
 *
 * The canonical cell is the app's real header menu (features/auth/components/
 * user-menu.tsx), minus the server action on „Abmelden".
 *
 * Single-mode cards show ONE export, and the harness enumerates exports in
 * esbuild's alphabetical order — not source order. Without a cfg
 * `primaryStory` the first name alphabetically wins, so the cells are named so
 * the user menu sorts first (Benutzermenue < Spaltenfilter <
 * Spieltagsauswahl). */

export function Benutzermenue() {
  return (
    <div className="flex justify-end pr-4">
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Testerino"
            className="flex items-center gap-1 rounded-md p-1 hover:bg-secondary data-[state=open]:bg-secondary"
          >
            <Avatar className="size-7">
              <AvatarImage src={AVATAR_URL} alt="" />
              <AvatarFallback className="text-xs">TE</AvatarFallback>
            </Avatar>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="w-48">
          <DropdownMenuLabel>Angemeldet als Testerino</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="font-medium">Profil</DropdownMenuItem>
          <DropdownMenuItem className="font-medium">
            <span className="flex w-full items-center justify-between">
              Staff-Bereich
              <span className="h-[7px] w-3.5 -skew-x-[18deg] bg-brand-orange" />
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem className="font-medium">Abmelden</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function Spaltenfilter() {
  return (
    <div className="flex justify-start pl-2">
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border px-3 py-1.5 font-medium text-sm data-[state=open]:bg-secondary"
          >
            <SlidersHorizontal className="size-3.5 text-muted-foreground" />
            Ansicht
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} className="w-[220px]">
          <DropdownMenuLabel>Spalten einblenden</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuCheckboxItem checked>
              Siege / Niederlagen
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked>
              Spielverhältnis
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Buchholz</DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Zurücksetzen
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function Spieltagsauswahl() {
  return (
    <div className="flex justify-start pl-2">
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 font-medium text-sm data-[state=open]:bg-secondary"
          >
            Spieltag 2
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} className="w-[220px]">
          <DropdownMenuLabel>Spieltag wählen</DropdownMenuLabel>
          <DropdownMenuRadioGroup value="2">
            <DropdownMenuRadioItem value="1">
              Spieltag 1
              <span className="ml-auto text-muted-foreground text-xs">fertig</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="2">
              Spieltag 2
              <span className="ml-auto text-muted-foreground text-xs">läuft</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="3" disabled>
              Spieltag 3
              <span className="ml-auto text-muted-foreground text-xs">ab 19.01.</span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            Spieltag zurücksetzen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
