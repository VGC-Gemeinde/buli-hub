import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Identity } from "../dashboard";

// A player's Discord avatar with an initials fallback — shared across the
// dashboard's hero, schedule rows, and standings tables.
export function PlayerAvatar({
  identity,
  size = "size-7",
  filled = false,
}: {
  identity: Identity;
  size?: string;
  filled?: boolean;
}) {
  return (
    <Avatar className={size}>
      {identity.avatarUrl ? (
        <AvatarImage src={identity.avatarUrl} alt="" />
      ) : null}
      <AvatarFallback
        className={cn(
          "font-semibold text-[10px]",
          filled && "bg-brand-blue text-white",
        )}
      >
        {identity.name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
