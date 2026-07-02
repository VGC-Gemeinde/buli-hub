import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { signOut } from "../actions";
import type { DiscordIdentity } from "../identity";

export function UserMenu({ identity }: { identity: DiscordIdentity }) {
  const name = identity.displayName ?? "Discord-Nutzer";

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        {identity.avatarUrl ? (
          <AvatarImage src={identity.avatarUrl} alt={name} />
        ) : null}
        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">{name}</span>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          Abmelden
        </Button>
      </form>
    </div>
  );
}
